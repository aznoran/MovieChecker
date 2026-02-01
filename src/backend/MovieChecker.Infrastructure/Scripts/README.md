# Personal Groups Migration Guide

This guide explains how to migrate from the old system (where personal entries had `group_id = NULL`) to the new system (where each user has a Personal group).

## Overview

The new `GroupType` enum replaces the boolean `IsPrivate` property:
- `Public (0)` - Anyone can join and view
- `Private (1)` - Requires password/OTP to join  
- `Personal (2)` - Single user's private watch list

## Migration Steps

### Step 1: Apply Entity Framework Migration

First, create and apply the EF migration to add the `group_type` column:

```bash
cd src/backend/MovieChecker.Web
dotnet ef migrations add AddGroupTypeColumn
dotnet ef database update
```

### Step 2: Migrate Existing Group Types

Run the SQL script to set `group_type` based on existing `is_private` values:

```bash
psql -h localhost -U postgres -d moviechecker -f src/backend/MovieChecker.Infrastructure/Scripts/01_AddGroupTypeColumn.sql
```

### Step 3: Create Personal Groups for Existing Users

Run the SQL script to create a Personal group for each existing user:

```bash
psql -h localhost -U postgres -d moviechecker -f src/backend/MovieChecker.Infrastructure/Scripts/02_CreatePersonalGroups.sql
```

### Step 4: Migrate Watch Entries

Run the SQL script to move watch entries with `group_id = NULL` to their user's Personal group:

```bash
psql -h localhost -U postgres -d moviechecker -f src/backend/MovieChecker.Infrastructure/Scripts/03_MigrateWatchEntries.sql
```

### Step 5: Verify Migration

Run the verification script to ensure everything migrated correctly:

```bash
psql -h localhost -U postgres -d moviechecker -f src/backend/MovieChecker.Infrastructure/Scripts/04_VerifyMigration.sql
```

All checks should return 0 counts (except for group type distribution which shows the count per type).

### Step 6: (Optional) Remove IsPrivate Column

After verifying the migration, you can optionally remove the `is_private` column:

1. Update the `Group` model to remove `IsPrivate` property
2. Update all DTOs and endpoints to remove `IsPrivate` references
3. Create a new migration:

```bash
cd src/backend/MovieChecker.Web
dotnet ef migrations add RemoveIsPrivateColumn
dotnet ef database update
```

## Rollback

If you need to rollback:

1. Restore watch entries with Personal group to have `group_id = NULL`
2. Delete all Personal groups
3. Remove the `group_type` column using a rollback migration

## Notes

- New user registrations automatically create a Personal group
- The old behavior (entries with `group_id = NULL`) is still supported for backwards compatibility
- The frontend can now use `groupType` to filter and display groups appropriately
