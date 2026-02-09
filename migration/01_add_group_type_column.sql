-- Step 1: Add group_type column to groups table
-- GroupType: Public = 0, Private = 1, Personal = 2

ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_type integer NOT NULL DEFAULT 0;

-- Set existing private groups to Private type
UPDATE groups SET group_type = 1 WHERE is_private = true;
