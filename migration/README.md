# Personal Groups Migration Guide

This directory contains SQL scripts to migrate the database to support personal groups as explicit entities.

## Background

Previously, personal watch entries had `group_id = NULL`. This migration introduces a `GroupType` enum and creates explicit Personal groups for each user, moving legacy entries into them.

## Prerequisites

- PostgreSQL database with the MovieChecker schema already applied
- Backup your database before running the migration

## Migration Steps

Run the scripts in order against your PostgreSQL database:

### Step 1: Add `group_type` column

```bash
psql -U your_user -d your_database -f 01_add_group_type_column.sql
```

Adds the `group_type` column (default `0` = Public) and sets existing private groups to `Private` (1).

### Step 2: Create Personal groups for existing users

```bash
psql -U your_user -d your_database -f 02_create_personal_groups.sql
```

Creates a Personal group (type `2`) for each existing user and adds them as Owner members.

### Step 3: Move entries with `group_id = NULL` to personal groups

```bash
psql -U your_user -d your_database -f 03_move_entries_to_personal_groups.sql
```

Migrates all legacy personal entries (with `group_id = NULL`) into the corresponding user's personal group.

### Step 4: Verify migration

```bash
psql -U your_user -d your_database -f 04_verify_migration.sql
```

Runs verification queries to ensure:
- All users have a personal group
- No watch entries remain with `group_id = NULL`
- Personal groups have correct structure

### Step 5: Update unique index on invite_code

```bash
psql -U your_user -d your_database -f 05_update_invite_code_index.sql
```

Updates the unique index on `invite_code` to only apply to non-null values, allowing personal groups to have `NULL` invite codes.

## EF Core Migration

After running the SQL scripts, the repository owner should create an EF Core migration to keep the model snapshot in sync:

```bash
cd src/backend/MovieChecker.Web
dotnet ef migrations add AddGroupTypeAndWatchEntryGroups
```

### Step 6: Create `watch_entry_groups` junction table

```bash
psql -U your_user -d your_database -f 06_create_watch_entry_groups_table.sql
```

Creates the `watch_entry_groups` many-to-many junction table between `watch_entries` and `groups`. Populates it from existing entries that already have a `group_id`. This replaces the entry duplication approach — a single watch entry can now be linked to multiple groups (e.g., the group where it was created + the personal groups of viewers).

## Rollback

If needed, you can reverse the migration (before running Step 5):

```sql
-- Drop junction table (Step 6)
DROP TABLE IF EXISTS watch_entry_groups;

-- Move entries back to NULL group_id
UPDATE watch_entries we
SET group_id = NULL
FROM groups g
WHERE we.group_id = g.id AND g.group_type = 2;

-- Remove personal group members
DELETE FROM group_members
WHERE group_id IN (SELECT id FROM groups WHERE group_type = 2);

-- Remove personal groups
DELETE FROM groups WHERE group_type = 2;

-- Remove group_type column
ALTER TABLE groups DROP COLUMN IF EXISTS group_type;
```
