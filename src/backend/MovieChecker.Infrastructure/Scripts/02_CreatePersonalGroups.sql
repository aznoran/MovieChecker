-- Migration Step 2: Create personal groups for all existing users
-- Run this AFTER step 1 (01_AddGroupTypeColumn.sql)

-- This script creates a personal group for each user that doesn't have one
-- and updates their watch entries with null group_id to use the new personal group

-- Create personal groups for users who don't have one
-- Note: Personal groups don't need invite codes since they can't be joined
DO $$
DECLARE
    user_record RECORD;
    new_group_id integer;
BEGIN
    -- Loop through all users who don't have a personal group
    FOR user_record IN 
        SELECT u.id, u.display_name 
        FROM users u
        WHERE NOT EXISTS (
            SELECT 1 FROM groups g 
            WHERE g.created_by_user_id = u.id 
            AND g.group_type = 2  -- Personal
        )
    LOOP
        -- Create the personal group (no invite code needed)
        INSERT INTO groups (name, invite_code, created_by_user_id, is_private, group_type, password_hash, default_role, created_at)
        VALUES (
            user_record.display_name || '''s Personal',
            NULL,  -- Personal groups don't need invite codes
            user_record.id,
            false,
            2,  -- Personal group type
            NULL,
            3,  -- Owner role as default
            NOW()
        )
        RETURNING id INTO new_group_id;
        
        -- Add user as owner of their personal group
        INSERT INTO group_members (group_id, user_id, role, joined_at)
        VALUES (new_group_id, user_record.id, 3, NOW());  -- 3 = Owner role
        
        RAISE NOTICE 'Created personal group % for user % (ID: %)', new_group_id, user_record.display_name, user_record.id;
    END LOOP;
END $$;

-- Verify personal groups were created
SELECT 
    u.id as user_id, 
    u.display_name, 
    g.id as personal_group_id, 
    g.name as group_name
FROM users u
LEFT JOIN groups g ON g.created_by_user_id = u.id AND g.group_type = 2
ORDER BY u.id;
