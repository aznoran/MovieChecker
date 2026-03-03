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

## Frontend API Client Rules
- All backend API calls in the frontend MUST go through either:
  - Custom React Query hooks in `frontend/src/hooks/api/` (preferred for components)
  - `apiClient` from `frontend/src/lib/api/client.ts` (for complex multi-step mutations)
- NEVER create wrapper functions around the generated API — use the generated methods on `apiClient.api.xxx()` directly
- All query/mutation keys MUST be defined in `frontend/src/hooks/api/keys.ts` — never use inline string arrays
- Frontend types and API client are auto-generated in `frontend/src/lib/api/generated.ts` — do NOT add custom interfaces for API response types
- `getPosterUrl` utility lives in `frontend/src/lib/api/client.ts`
