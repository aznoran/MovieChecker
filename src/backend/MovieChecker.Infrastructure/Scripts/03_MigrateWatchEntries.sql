-- Migration Step 3: Migrate watch entries with null group_id to personal groups
-- Run this AFTER step 2 (02_CreatePersonalGroups.sql)

-- This script updates all watch entries that have group_id = NULL
-- to use the user's personal group instead

-- Update watch entries to use personal groups
UPDATE watch_entries we
SET group_id = (
    SELECT g.id 
    FROM groups g 
    WHERE g.created_by_user_id = we.user_id 
    AND g.group_type = 2  -- Personal
    LIMIT 1
)
WHERE we.group_id IS NULL
AND EXISTS (
    SELECT 1 FROM groups g 
    WHERE g.created_by_user_id = we.user_id 
    AND g.group_type = 2
);

-- Verify the update - show entries that still have null group_id (should be none)
SELECT 
    we.id, 
    we.movie_id, 
    we.user_id, 
    we.group_id,
    u.display_name
FROM watch_entries we
JOIN users u ON u.id = we.user_id
WHERE we.group_id IS NULL;

-- Show summary of entries per group type
SELECT 
    CASE g.group_type 
        WHEN 0 THEN 'Public'
        WHEN 1 THEN 'Private'
        WHEN 2 THEN 'Personal'
        ELSE 'Unknown'
    END as group_type,
    COUNT(*) as entry_count
FROM watch_entries we
LEFT JOIN groups g ON g.id = we.group_id
GROUP BY g.group_type
ORDER BY g.group_type;
