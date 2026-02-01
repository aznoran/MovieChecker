-- Migration Step 1: Add group_type column to groups table
-- Run this AFTER applying the EF migration that adds the group_type column

-- This script ensures the group_type column has a default value
-- GroupType enum: Public = 0, Private = 1, Personal = 2

-- Set default group_type based on is_private:
-- is_private = true -> group_type = 1 (Private)
-- is_private = false -> group_type = 0 (Public)
UPDATE groups 
SET group_type = CASE 
    WHEN is_private = true THEN 1 
    ELSE 0 
END
WHERE group_type IS NULL OR group_type = 0;

-- Verify the update
SELECT id, name, is_private, group_type FROM groups;
