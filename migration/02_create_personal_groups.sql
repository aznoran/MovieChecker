-- Step 2: Create Personal groups for existing users who don't already have one
-- Each user gets a personal group with null invite_code and group_type = 2

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
