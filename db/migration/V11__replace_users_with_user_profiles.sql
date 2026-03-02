-- V11: Replace `users` table with lightweight `user_profiles` (Authentik is now the source of truth)

-- 1. Create the new table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    display_name TEXT NOT NULL,
    username TEXT NOT NULL
);

CREATE UNIQUE INDEX ix_user_profiles_username ON user_profiles (username);

-- 2. Migrate existing data
INSERT INTO user_profiles (id, display_name, username)
SELECT id, display_name, username FROM users;

-- 3. Drop ALL FK constraints referencing `users` (names vary across environments)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass AS tablename
        FROM pg_constraint
        WHERE confrelid = 'users'::regclass
          AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tablename, r.conname);
    END LOOP;
END $$;

-- 4. Drop the old table
DROP TABLE users;

-- 5. Re-add FK constraints pointing to user_profiles
ALTER TABLE groups
    ADD CONSTRAINT fk_groups_user_profiles_created_by_user_id
    FOREIGN KEY (created_by_user_id) REFERENCES user_profiles (id) ON DELETE CASCADE;

ALTER TABLE group_members
    ADD CONSTRAINT fk_group_members_user_profiles_user_id
    FOREIGN KEY (user_id) REFERENCES user_profiles (id) ON DELETE CASCADE;

ALTER TABLE watch_entries
    ADD CONSTRAINT fk_watch_entries_user_profiles_user_id
    FOREIGN KEY (user_id) REFERENCES user_profiles (id) ON DELETE CASCADE;

ALTER TABLE entry_ratings
    ADD CONSTRAINT fk_entry_ratings_user_profiles_user_id
    FOREIGN KEY (user_id) REFERENCES user_profiles (id) ON DELETE CASCADE;

ALTER TABLE invite_links
    ADD CONSTRAINT fk_invite_links_user_profiles_created_by_user_id
    FOREIGN KEY (created_by_user_id) REFERENCES user_profiles (id) ON DELETE CASCADE;

ALTER TABLE user_settings
    ADD CONSTRAINT fk_user_settings_user_profiles_user_id
    FOREIGN KEY (user_id) REFERENCES user_profiles (id) ON DELETE CASCADE;
