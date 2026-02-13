# Database Migrations (Flyway)

Database schema is managed by [Flyway](https://flywaydb.org/) using versioned SQL scripts.

## Directory Structure

```
db/migration/
├── V1__initial_schema.sql       — Base tables (movies, users, groups, etc.)
├── V2__personal_groups.sql      — GroupType, personal groups, data migration
└── V3__watch_entry_groups.sql   — Many-to-many junction table
```

## How It Works

- Flyway runs automatically via Docker Compose before the backend starts
- The backend no longer runs EF Core migrations on startup
- Flyway tracks applied migrations in the `flyway_schema_history` table
- All scripts use `IF NOT EXISTS` / `IF EXISTS` for production safety

## Naming Convention

```
V{version}__{description}.sql
```

- `V` prefix + integer version + double underscore + description
- Versions are applied in order, once per database

## Running Locally

### Via Docker Compose (recommended)

```bash
docker-compose up
```

Flyway runs before the backend starts — migrations are applied automatically.

### Standalone Flyway

```bash
flyway -url=jdbc:postgresql://localhost:5432/moviechecker \
       -user=moviechecker \
       -password=moviechecker_secret \
       -locations=filesystem:./db/migration \
       -baselineOnMigrate=true \
       -baselineVersion=0 \
       migrate
```

### Manual psql

```bash
psql -U moviechecker -d moviechecker -f db/migration/V1__initial_schema.sql
psql -U moviechecker -d moviechecker -f db/migration/V2__personal_groups.sql
psql -U moviechecker -d moviechecker -f db/migration/V3__watch_entry_groups.sql
```

## Production Notes

- **Existing databases**: Set `FLYWAY_BASELINE_ON_MIGRATE=true` so Flyway creates its history table alongside existing data
- **`IF NOT EXISTS`**: All `CREATE TABLE` / `CREATE INDEX` statements are idempotent
- **Data migrations**: V2 creates personal groups for existing users and moves orphaned entries — safe to re-run

## Adding New Migrations

1. Create a new file: `V{next}__{description}.sql`
2. Use `IF NOT EXISTS` for `CREATE TABLE` / `CREATE INDEX`
3. Use idempotent patterns for data migrations (`WHERE NOT EXISTS`)
4. Test locally with `docker-compose up`
