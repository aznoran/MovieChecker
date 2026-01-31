"# MovieChecker

A full-stack web application for tracking and managing movie watch lists with groups.

## Features

- 🎬 Track movies and TV shows
- ⭐ Rate and review content
- 👥 Create groups to collaborate on watch lists
- 📊 View statistics about your watching habits
- 🔐 Secure JWT-based authentication

## Technology Stack

### Backend
- .NET 10.0 with ASP.NET Core
- PostgreSQL 17 with Entity Framework Core
- JWT Authentication
- Swagger/OpenAPI for API documentation

### Frontend
- Next.js 16 with App Router
- React 19 with TypeScript
- Tailwind CSS 4 with Radix UI
- TanStack Query for state management

## Getting Started

### Prerequisites
- .NET 10.0 SDK
- Node.js 18+
- PostgreSQL 17
- Docker & Docker Compose (optional)

### Running with Docker Compose

```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Swagger UI: http://localhost:5000/swagger

### Running Locally

#### Backend
```bash
cd src/backend/MovieChecker.Web
dotnet restore
dotnet run
```

#### Frontend
```bash
cd src/frontend
npm install
npm run dev
```

## API Documentation

The backend API is documented using Swagger/OpenAPI. When running in development mode, interactive API documentation is available at:

```
http://localhost:5000/swagger
```

For more details on using Swagger and generating API clients, see [docs/SWAGGER.md](docs/SWAGGER.md).

## Development

### Database Migrations

```bash
cd src/backend/MovieChecker.Web
dotnet ef migrations add MigrationName
dotnet ef database update
```

### API Client Generation

To generate a TypeScript client from the OpenAPI specification:

```bash
cd src/frontend
npm run generate:api
```

See [docs/SWAGGER.md](docs/SWAGGER.md) for more information.

## Project Structure

```
MovieChecker/
├── src/
│   ├── backend/
│   │   ├── MovieChecker.Domain/      # Domain models
│   │   ├── MovieChecker.Infrastructure/  # Data access
│   │   └── MovieChecker.Web/         # API endpoints
│   └── frontend/                     # Next.js frontend
├── docs/                             # Documentation
├── scripts/                          # Utility scripts
└── docker-compose.yml                # Docker configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License." 
