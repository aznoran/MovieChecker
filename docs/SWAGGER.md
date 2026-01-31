# Swagger/OpenAPI Documentation

This document describes how to use the Swagger/OpenAPI documentation for the MovieChecker API.

## Accessing Swagger UI

Swagger UI is available in **Development** environment only.

### Local Development

1. Start the backend in Development mode:
   ```bash
   cd src/backend/MovieChecker.Web
   ASPNETCORE_ENVIRONMENT=Development dotnet run
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000/swagger
   ```
   
   Note: The default port is 5000. If you're running on a different port, adjust the URL accordingly.

### With Docker

1. Start the services:
   ```bash
   docker-compose up
   ```

2. Swagger UI will be available based on your environment configuration.

## Features

### Interactive API Documentation

Swagger UI provides:
- **Complete API Reference**: All endpoints with request/response schemas
- **Try It Out**: Execute API calls directly from the browser
- **JWT Authentication**: Built-in authentication support

### JWT Authentication in Swagger

To test authenticated endpoints:

1. Click the **Authorize** button (lock icon) at the top right
2. Register a new user via `/api/auth/register` or login via `/api/auth/login`
3. Copy the JWT token from the response
4. Enter `Bearer <your-token>` in the authorization dialog
5. Click **Authorize**

Now all API calls will include the authentication token.

## OpenAPI Specification

The OpenAPI specification is available at:
```
http://localhost:5000/swagger/v1/swagger.json
```

### Downloading the Specification

```bash
curl http://localhost:5000/swagger/v1/swagger.json > openapi.json
```

## API Endpoints Summary

The API includes endpoints for:
- **Authentication** (`/api/auth/*`)
- **Movies** (`/api/movies/*`)
- **Watch Entries** (`/api/watch-entries/*`)
- **Groups** (`/api/groups/*`)
- **File Upload** (`/api/upload/*`)

## Generating Frontend API Client

The OpenAPI specification can be used to generate type-safe API clients for the frontend.

### Recommended Tools

1. **openapi-typescript-codegen**
   ```bash
   npm install --save-dev openapi-typescript-codegen
   npx openapi-typescript-codegen --input http://localhost:5000/swagger/v1/swagger.json --output ./src/api
   ```

2. **swagger-typescript-api**
   ```bash
   npm install --save-dev swagger-typescript-api
   npx swagger-typescript-api -p http://localhost:5000/swagger/v1/swagger.json -o ./src/api -n api.ts
   ```

3. **@openapitools/openapi-generator-cli**
   ```bash
   npm install --save-dev @openapitools/openapi-generator-cli
   npx openapi-generator-cli generate -i http://localhost:5000/swagger/v1/swagger.json -g typescript-axios -o ./src/api
   ```

## Schema Components

The API defines the following data models:
- `ContentType`
- `CreateGroupRequest`
- `CreateMovieRequest`
- `CreateWatchEntryRequest`
- `Emotion`
- `JoinGroupRequest`
- `LoginRequest`
- `RateRequest`
- `RegisterRequest`
- `TransferGroupRequest`
- `UpdateMovieRequest`
- `UpdateWatchEntryRequest`
- `UserRatingInput`
- `WatchStatus`
- `WatchedBy`

## Security

- Swagger UI is **only enabled in Development** environment
- Production deployments will not expose Swagger UI
- JWT authentication is required for most endpoints
- Always use HTTPS in production environments

## Troubleshooting

### Swagger UI Not Loading

- Ensure `ASPNETCORE_ENVIRONMENT=Development` is set
- Check that the backend is running
- Verify the port (default: 5000)

### Authentication Issues

- Obtain a valid JWT token first via `/api/auth/login` or `/api/auth/register`
- Use the format: `Bearer <token>` (with space after "Bearer")
- Token must be valid and not expired

### CORS Issues

- Swagger UI runs in the same origin as the API
- External tools may need CORS configuration adjustments

## Package Information

**Swashbuckle.AspNetCore**: Version 6.10.2 (NuGet resolves to 7.0.0 due to availability)
**Microsoft.OpenApi**: Version 1.6.22

Note: The .csproj specifies Swashbuckle.AspNetCore 6.10.2, but NuGet automatically resolves to 7.0.0 as 6.10.2 is not available in the package repository.

## References

- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [Swashbuckle.AspNetCore Documentation](https://github.com/domaindrivendev/Swashbuckle.AspNetCore)
- [ASP.NET Core OpenAPI Support](https://learn.microsoft.com/en-us/aspnet/core/tutorials/web-api-help-pages-using-swagger)
