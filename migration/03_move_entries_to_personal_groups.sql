-- Step 3: Move entries with group_id = NULL to personal groups
-- This migrates legacy personal entries to use the new personal group structure

UPDATE watch_entries we
SET group_id = g.id
FROM groups g
WHERE we.group_id IS NULL
  AND g.created_by_user_id = we.user_id
  AND g.group_type = 2;
