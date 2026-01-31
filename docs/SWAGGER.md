# Swagger/OpenAPI Integration

MovieChecker includes Swagger/OpenAPI documentation for the backend API, making it easy to explore, test, and generate client code for the API endpoints.

## Accessing Swagger UI

When running the backend in development mode, Swagger UI is automatically available at:

```
http://localhost:5000/swagger
```

The Swagger UI provides:
- Interactive API documentation
- Try-it-out functionality to test endpoints directly
- Request/response examples
- JWT authentication support

## API Endpoints

The API is organized into the following groups:

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with username and password

### Movies
- `GET /api/movies` - Get all movies (with optional type filter)
- `GET /api/movies/{id}` - Get a movie by ID
- `POST /api/movies` - Create a new movie
- `PUT /api/movies/{id}` - Update an existing movie
- `DELETE /api/movies/{id}` - Delete a movie
- `GET /api/movies/search` - Search movies by title or description

### Watch Entries
- `GET /api/watch-entries` - Get all watch entries (with optional filters)
- `GET /api/watch-entries/{id}` - Get a watch entry by ID
- `POST /api/watch-entries` - Create a new watch entry
- `PUT /api/watch-entries/{id}` - Update a watch entry
- `DELETE /api/watch-entries/{id}` - Delete a watch entry
- `GET /api/watch-entries/stats` - Get watch statistics
- `POST /api/watch-entries/{id}/rate` - Rate a watch entry

### Groups
- `GET /api/groups` - Get all groups for the current user
- `GET /api/groups/{id}` - Get a specific group by ID
- `POST /api/groups` - Create a new group
- `POST /api/groups/join` - Join a group using an invite code
- `DELETE /api/groups/{id}/leave` - Leave a group
- `DELETE /api/groups/{id}/members/{userId}` - Remove a user from a group (owner only)
- `PUT /api/groups/{id}/transfer` - Transfer group ownership

### Upload
- `POST /api/upload/poster` - Upload a movie poster image
- `GET /api/posters/{id}` - Get a poster image by ID (public)

### Health
- `GET /api/health` - Health check endpoint

## Authentication

Most endpoints require JWT authentication. To use authenticated endpoints in Swagger UI:

1. Click the "Authorize" button at the top right
2. Enter your JWT token in the format: `Bearer <your-token>`
3. Click "Authorize" and then "Close"

You can obtain a token by:
1. Using the `/api/auth/register` endpoint to create an account
2. Using the `/api/auth/login` endpoint with your credentials
3. Copying the token from the response

## Generating TypeScript API Client

The project includes automated API client generation for the frontend. This ensures type-safe API calls and keeps the frontend in sync with the backend.

### Prerequisites

1. Start the backend server:
   ```bash
   cd src/backend/MovieChecker.Web
   dotnet run
   ```

2. The backend must be running at `http://localhost:5000`

### Generate the API Client

From the frontend directory:

```bash
cd src/frontend
npm run generate:api
```

Or use the script directly:

```bash
./scripts/generate-api-client.sh
```

This will:
1. Download the OpenAPI specification from the running backend
2. Generate TypeScript types and API client code
3. Place the generated code in `src/frontend/src/generated`

### Using the Generated Client

The generated client can be used instead of manual API calls:

```typescript
import { DefaultApi, Configuration } from '@/generated/api';
import { Movie } from '@/generated/models';

// Configure the API client
const config = new Configuration({
  basePath: 'http://localhost:5000/api',
  accessToken: 'your-jwt-token',
});

const api = new DefaultApi(config);

// Use type-safe API calls
const movies: Movie[] = await api.getMovies();
```

### Manual OpenAPI Spec Download

To download just the OpenAPI specification without generating the client:

```bash
cd src/frontend
npm run generate:spec
```

This saves the spec to `src/frontend/openapi.json`.

## Configuration

### Backend Configuration

Swagger is configured in `src/backend/MovieChecker.Web/Program.cs`:

- By default, Swagger UI is enabled in Development mode
- To enable in production, set `EnableSwagger=true` in your configuration

### Frontend Configuration

The API generation uses `@openapitools/openapi-generator-cli` with the `typescript-axios` generator. Configuration can be modified in `scripts/generate-api-client.sh`.

## Development Workflow

1. Make changes to the backend API endpoints
2. Start/restart the backend server
3. Verify changes in Swagger UI at http://localhost:5000/swagger
4. Regenerate the frontend API client: `npm run generate:api`
5. Update frontend code to use the new types/endpoints
6. Build and test the frontend

## Troubleshooting

### Swagger UI not available

- Make sure you're running in Development mode or have `EnableSwagger=true` set
- Check that the backend is running at the expected URL
- Verify no errors in the backend console

### API client generation fails

- Ensure the backend is running at `http://localhost:5000`
- Check that the Swagger endpoint is accessible: `curl http://localhost:5000/swagger/v1/swagger.json`
- Verify `@openapitools/openapi-generator-cli` is installed: `npm list @openapitools/openapi-generator-cli`

### Generated types don't match API

- Make sure you've restarted the backend after making changes
- Regenerate the client after every backend API change
- Clear the `src/generated` directory if you encounter issues: `rm -rf src/frontend/src/generated`

## Additional Resources

- [Swashbuckle Documentation](https://github.com/domaindrivendev/Swashbuckle.AspNetCore)
- [OpenAPI Specification](https://swagger.io/specification/)
- [OpenAPI Generator](https://openapi-generator.tech/)
