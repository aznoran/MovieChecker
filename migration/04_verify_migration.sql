-- Step 4: Verify migration
-- Run these queries to verify the migration was successful

-- Check all users have a personal group
SELECT u.id AS user_id, u.username, g.id AS personal_group_id
FROM users u
LEFT JOIN groups g ON g.created_by_user_id = u.id AND g.group_type = 2
WHERE g.id IS NULL;
-- Expected: 0 rows (all users have a personal group)

-- Check no watch entries remain with group_id = NULL
SELECT COUNT(*) AS orphaned_entries
FROM watch_entries
WHERE group_id IS NULL;
-- Expected: 0

-- Check personal groups have correct structure
SELECT g.id, g.name, g.group_type, g.invite_code, gm.user_id, gm.role
FROM groups g
JOIN group_members gm ON gm.group_id = g.id
WHERE g.group_type = 2
ORDER BY g.id;
-- Expected: Each personal group has one member (the owner) with role = 3 (Owner)

-- Summary
SELECT
    (SELECT COUNT(*) FROM groups WHERE group_type = 2) AS personal_groups,
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM watch_entries WHERE group_id IS NULL) AS orphaned_entries;
