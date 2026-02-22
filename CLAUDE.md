# Project Rules

## Database Migrations
- This project uses **Flyway** for database migrations, NOT EF Core migrations.
- Migration files go in `db/migration/` at the repository root.
- Naming convention: `V{number}__{description}.sql` (double underscore between version and description).
- Database is **PostgreSQL**.
- When modifying entities (adding/removing columns, tables), always create a corresponding Flyway migration file.

## API Code Generation
- Frontend types and API client are auto-generated in `frontend/src/lib/api/generated.ts`.
- After backend API changes: run the backend app first, then `npm run generate_api` in the frontend directory to regenerate `generated.ts`.
- `frontend/src/lib/api/client.ts` is a manual wrapper around the generated API client.
