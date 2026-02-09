-- V2: Personal groups — add group_type, create personal groups, migrate entries, update invite_code index
-- GroupType enum: Public = 0, Private = 1, Personal = 2

-- Step 1: Add group_type column
ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_type integer NOT NULL DEFAULT 0;

-- Set existing private groups to Private type
UPDATE groups SET group_type = 1 WHERE is_private = true AND group_type = 0;

-- Step 2: Make invite_code nullable (personal groups don't need invite codes)
ALTER TABLE groups ALTER COLUMN invite_code DROP NOT NULL;

-- Step 3: Create Personal groups for existing users who don't already have one
INSERT INTO groups (name, invite_code, created_by_user_id, is_private, group_type, password_hash, default_role, created_at)
SELECT
    u.display_name || ' Personal',
    NULL,
    u.id,
    false,
    2,  -- Personal
    NULL,
    3,  -- Owner
    NOW()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM groups g WHERE g.created_by_user_id = u.id AND g.group_type = 2
);

-- Add users as Owner members of their personal groups
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT g.id, g.created_by_user_id, 3, NOW()  -- Role 3 = Owner
FROM groups g
WHERE g.group_type = 2
AND NOT EXISTS (
    SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = g.created_by_user_id
);

-- Step 4: Move entries with group_id = NULL to personal groups
UPDATE watch_entries we
SET group_id = g.id
FROM groups g
WHERE we.group_id IS NULL
  AND g.created_by_user_id = we.user_id
  AND g.group_type = 2;

-- Step 5: Update unique index on invite_code to filter on non-null values only
DROP INDEX IF EXISTS ix_groups_invite_code;
CREATE UNIQUE INDEX ix_groups_invite_code ON groups (invite_code) WHERE invite_code IS NOT NULL;
