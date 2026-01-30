# MovieChecker - GitHub Copilot Instructions

This document provides guidance for GitHub Copilot when working with the MovieChecker codebase.

## Project Overview

MovieChecker is a full-stack web application for tracking and managing movie watch lists with groups. The application allows users to create watch lists, rate movies, and collaborate with groups to decide what to watch together.

## Technology Stack

### Backend (.NET)
- **Framework**: .NET 10.0 with ASP.NET Core
- **Architecture**: Clean Architecture with three layers:
  - `MovieChecker.Domain`: Domain models and entities
  - `MovieChecker.Infrastructure`: Data access, EF Core, database configurations
  - `MovieChecker.Web`: API endpoints, minimal API pattern
- **Database**: PostgreSQL 17 with Entity Framework Core
- **Authentication**: JWT-based authentication with BCrypt for password hashing
- **ORM**: Entity Framework Core 10.0 with Code-First migrations

### Frontend (Next.js)
- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4 with Radix UI components
- **State Management**: TanStack Query (React Query) for server state
- **HTTP Client**: Axios for API communication
- **Internationalization**: Custom i18n implementation (English and Russian)

### Infrastructure
- **Containerization**: Docker with Docker Compose
- **Reverse Proxy**: Nginx with SSL/TLS support
- **Database Admin**: pgAdmin 4

## Architecture Guidelines

### Backend Architecture
1. **Clean Architecture Principles**:
   - Domain layer contains only domain models with no external dependencies
   - Infrastructure layer handles data persistence and external services
   - Web layer contains API endpoints using minimal API pattern
   
2. **Endpoint Organization**:
   - Endpoints are organized by feature in separate files (e.g., `MovieEndpoints.cs`, `AuthEndpoints.cs`)
   - Use extension methods to map endpoint groups (e.g., `MapMovieEndpoints()`)
   - All API endpoints should be prefixed with `/api`

3. **Database Patterns**:
   - Use Entity Framework Core with explicit configurations in `Configurations` folder
   - Apply migrations automatically on startup with retry logic
   - Use meaningful naming for entities and properties

### Frontend Architecture
1. **Component Organization**:
   - Components should be placed in `src/components`
   - Use the App Router pattern with pages in `src/app`
   - Context providers in `src/context`
   - Custom hooks in `src/hooks`

2. **API Communication**:
   - All API calls should go through the centralized `src/lib/api.ts` module
   - Use TanStack Query for data fetching and caching
   - Handle loading and error states consistently

3. **Styling**:
   - Use Tailwind CSS utility classes
   - Leverage Radix UI components for accessible UI elements
   - Use the `cn()` utility from `src/lib/utils.ts` for conditional classes

## Coding Standards

### C# (.NET Backend)
- Use **implicit usings** (enabled in project file)
- Enable **nullable reference types**
- Follow standard C# naming conventions:
  - PascalCase for classes, methods, properties, and public members
  - camelCase for local variables and private fields
  - Use descriptive names that convey intent
- Use minimal API pattern for endpoints (no controllers)
- Apply async/await for I/O operations
- Use LINQ for data queries

### TypeScript (Frontend)
- Strict TypeScript configuration
- Define types in `src/types/index.ts` or alongside components
- Use functional components with hooks
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for component definitions
- Follow React hooks rules (use-* naming, top-level calls)

### General Conventions
- Use meaningful commit messages
- Keep functions small and focused (single responsibility)
- Add comments only when necessary to explain "why", not "what"
- Handle errors gracefully with user-friendly messages

## Development Workflow

### Issue and Pull Request Management

When working on tasks in this repository, follow these important workflow steps:

1. **Always Create an Issue First**:
   - If there is no existing issue for the task you're working on, create one before starting implementation
   - Issues should have a clear title and description of what needs to be done
   - This ensures all work is tracked and documented

2. **Update Issue Status**:
   - When you begin implementing a task, move the issue status from "Backlog" to "Ready"
   - This indicates the issue is actively being worked on
   - Keep the issue updated as you make progress

3. **Create a Draft Pull Request**:
   - Always create a draft pull request when you start implementing the task
   - Link the PR to the issue you're working on
   - Mark the PR as ready for review only after all changes are complete and tested
   - This allows for early visibility and feedback on your work

### Running the Application
```bash
# Full stack with Docker Compose
docker-compose up --build

# Backend only (requires PostgreSQL running)
cd src/backend/MovieChecker.Web
dotnet run

# Frontend only
cd src/frontend
npm install
npm run dev
```

### Database Migrations
```bash
cd src/backend/MovieChecker.Web
dotnet ef migrations add MigrationName
dotnet ef database update
```

### Frontend Development
```bash
cd src/frontend
npm install          # Install dependencies
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Run ESLint
```

## Testing Guidelines

- Write unit tests for business logic in the Domain layer
- Test API endpoints with integration tests
- Use meaningful test names that describe the scenario
- Mock external dependencies appropriately
- Follow AAA pattern: Arrange, Act, Assert

## Common Patterns

### Adding a New API Endpoint
1. Define the domain model in `MovieChecker.Domain/Models/`
2. Create entity configuration in `MovieChecker.Infrastructure/Data/Configurations/`
3. Update `AppDbContext` to include the new entity
4. Create and apply database migration
5. Add endpoint methods in `MovieChecker.Web/Endpoints/`
6. Map the endpoints in `Program.cs`

### Adding a New Frontend Page
1. Create page component in `src/app/[route]/page.tsx`
2. Define types in `src/types/index.ts` if needed
3. Create API functions in `src/lib/api.ts`
4. Use TanStack Query hooks for data fetching
5. Add i18n labels in `src/lib/i18n/` if needed

### Authentication
- JWT tokens are issued by the backend on successful login
- Frontend stores tokens and includes them in API requests
- Protected routes should check authentication state
- Use the authentication context for user state management

## Security Considerations

- Never commit sensitive credentials or API keys
- Use environment variables for configuration (`.env` file)
- Validate all user inputs on both frontend and backend
- Use parameterized queries to prevent SQL injection
- Implement proper CORS configuration
- Hash passwords with BCrypt before storing
- Validate JWT tokens on protected endpoints

## API Conventions

- Use RESTful principles for endpoint design
- Return appropriate HTTP status codes:
  - 200 OK for successful GET requests
  - 201 Created for successful POST requests
  - 204 No Content for successful DELETE requests
  - 400 Bad Request for validation errors
  - 401 Unauthorized for authentication failures
  - 404 Not Found for missing resources
- Use consistent response formats
- Include proper error messages in responses

## Additional Notes

- The application uses HTTPS in production via Nginx reverse proxy
- SSL certificates are managed with Let's Encrypt
- Database connection strings are configured via environment variables
- The frontend proxies API requests through Nginx to avoid CORS issues
- Support for multiple languages (English and Russian) through i18n system
