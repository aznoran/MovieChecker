-- V9: Migrate users.id from SERIAL INT to UUID
-- Authentik users get id = authentik_id::UUID; others get gen_random_uuid()
-- Removes redundant authentik_id column (id IS the Authentik sub from now on)

CREATE TABLE users_new (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

INSERT INTO users_new (id, username, password_hash, display_name, created_at)
SELECT
    CASE WHEN authentik_id IS NOT NULL THEN authentik_id::UUID
         ELSE gen_random_uuid() END,
    username, password_hash, display_name, created_at
FROM users;

-- Build old_id -> new_id mapping (username is UNIQUE, safe to join on)
CREATE TEMP TABLE user_id_mapping AS
SELECT u.id AS old_id, n.id AS new_id
FROM users u JOIN users_new n ON u.username = n.username;

-- Add new UUID FK columns
ALTER TABLE groups        ADD COLUMN created_by_user_id_new UUID;
ALTER TABLE user_settings ADD COLUMN user_id_new UUID;
ALTER TABLE group_members  ADD COLUMN user_id_new UUID;
ALTER TABLE watch_entries  ADD COLUMN user_id_new UUID;
ALTER TABLE entry_ratings  ADD COLUMN user_id_new UUID;
ALTER TABLE invite_links   ADD COLUMN created_by_user_id_new UUID;

-- Populate from mapping
UPDATE groups          SET created_by_user_id_new  = m.new_id FROM user_id_mapping m WHERE created_by_user_id  = m.old_id;
UPDATE user_settings   SET user_id_new             = m.new_id FROM user_id_mapping m WHERE user_id             = m.old_id;
UPDATE group_members   SET user_id_new             = m.new_id FROM user_id_mapping m WHERE user_id             = m.old_id;
UPDATE watch_entries   SET user_id_new             = m.new_id FROM user_id_mapping m WHERE user_id             = m.old_id;
UPDATE entry_ratings   SET user_id_new             = m.new_id FROM user_id_mapping m WHERE user_id             = m.old_id;
UPDATE invite_links    SET created_by_user_id_new  = m.new_id FROM user_id_mapping m WHERE created_by_user_id  = m.old_id;

-- Drop old FK constraints
ALTER TABLE groups        DROP CONSTRAINT fk_groups_users_created_by_user_id;
ALTER TABLE user_settings DROP CONSTRAINT fk_user_settings_users_user_id;
ALTER TABLE group_members  DROP CONSTRAINT fk_group_members_users_user_id;
ALTER TABLE watch_entries  DROP CONSTRAINT fk_watch_entries_users_user_id;
ALTER TABLE entry_ratings  DROP CONSTRAINT fk_entry_ratings_users_user_id;
ALTER TABLE invite_links   DROP CONSTRAINT fk_invite_links_users;

-- Drop old INT FK columns
ALTER TABLE groups        DROP COLUMN created_by_user_id;
ALTER TABLE user_settings DROP COLUMN user_id;
ALTER TABLE group_members  DROP COLUMN user_id;
ALTER TABLE watch_entries  DROP COLUMN user_id;
ALTER TABLE entry_ratings  DROP COLUMN user_id;
ALTER TABLE invite_links   DROP COLUMN created_by_user_id;

-- Rename new UUID columns
ALTER TABLE groups        RENAME COLUMN created_by_user_id_new  TO created_by_user_id;
ALTER TABLE user_settings RENAME COLUMN user_id_new             TO user_id;
ALTER TABLE group_members  RENAME COLUMN user_id_new             TO user_id;
ALTER TABLE watch_entries  RENAME COLUMN user_id_new             TO user_id;
ALTER TABLE entry_ratings  RENAME COLUMN user_id_new             TO user_id;
ALTER TABLE invite_links   RENAME COLUMN created_by_user_id_new  TO created_by_user_id;

-- NOT NULL constraints
ALTER TABLE groups        ALTER COLUMN created_by_user_id SET NOT NULL;
ALTER TABLE user_settings ALTER COLUMN user_id             SET NOT NULL;
ALTER TABLE group_members  ALTER COLUMN user_id             SET NOT NULL;
ALTER TABLE watch_entries  ALTER COLUMN user_id             SET NOT NULL;
ALTER TABLE entry_ratings  ALTER COLUMN user_id             SET NOT NULL;
ALTER TABLE invite_links   ALTER COLUMN created_by_user_id  SET NOT NULL;

-- Swap tables
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Restore FK constraints
ALTER TABLE groups        ADD CONSTRAINT fk_groups_users_created_by_user_id  FOREIGN KEY (created_by_user_id)  REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE user_settings ADD CONSTRAINT fk_user_settings_users_user_id      FOREIGN KEY (user_id)             REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE group_members  ADD CONSTRAINT fk_group_members_users_user_id      FOREIGN KEY (user_id)             REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE watch_entries  ADD CONSTRAINT fk_watch_entries_users_user_id      FOREIGN KEY (user_id)             REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE entry_ratings  ADD CONSTRAINT fk_entry_ratings_users_user_id      FOREIGN KEY (user_id)             REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE invite_links   ADD CONSTRAINT fk_invite_links_users               FOREIGN KEY (created_by_user_id)  REFERENCES users (id) ON DELETE CASCADE;

-- Recreate indexes
CREATE UNIQUE INDEX ix_users_username                       ON users (username);
CREATE INDEX        ix_groups_created_by_user_id            ON groups (created_by_user_id);
CREATE UNIQUE INDEX ix_user_settings_user_id                ON user_settings (user_id);
CREATE INDEX        ix_group_members_user_id                ON group_members (user_id);
CREATE UNIQUE INDEX ix_group_members_group_id_user_id       ON group_members (group_id, user_id);
CREATE INDEX        ix_watch_entries_user_id                ON watch_entries (user_id);
CREATE INDEX        ix_entry_ratings_user_id                ON entry_ratings (user_id);
CREATE UNIQUE INDEX ix_entry_ratings_watch_entry_id_user_id ON entry_ratings (watch_entry_id, user_id);
