-- Step 5: Update unique index on invite_code to filter on non-null values only
-- This allows personal groups to have NULL invite_code

DROP INDEX IF EXISTS ix_groups_invite_code;
CREATE UNIQUE INDEX ix_groups_invite_code ON groups (invite_code) WHERE invite_code IS NOT NULL;
