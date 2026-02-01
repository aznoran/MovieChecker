-- Migration Step 4: Verify migration and optionally drop is_private column
-- Run this AFTER step 3 (03_MigrateWatchEntries.sql)

-- First, verify all data is consistent:

-- 1. Check that all users have a personal group
SELECT 
    'Users without personal group' as check_name,
    COUNT(*) as count
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM groups g 
    WHERE g.created_by_user_id = u.id 
    AND g.group_type = 2
);

-- 2. Check that watch entries with null group_id are migrated (should be 0)
SELECT 
    'Watch entries with null group_id' as check_name,
    COUNT(*) as count
FROM watch_entries 
WHERE group_id IS NULL;

-- 3. Check group type distribution
SELECT 
    'Group type distribution' as check_name,
    group_type,
    COUNT(*) as count
FROM groups
GROUP BY group_type;

-- 4. Check that is_private matches group_type for non-personal groups
SELECT 
    'Groups with mismatched is_private/group_type' as check_name,
    COUNT(*) as count
FROM groups
WHERE group_type != 2  -- Not personal
AND (
    (is_private = true AND group_type != 1) OR
    (is_private = false AND group_type != 0)
);

-- If all checks pass (counts are 0 or expected), you can proceed to drop is_private column
-- Create a new EF migration that removes the is_private column:
-- dotnet ef migrations add RemoveIsPrivateColumn
-- dotnet ef database update

-- The migration should include:
-- migrationBuilder.DropColumn(name: "is_private", table: "groups");
