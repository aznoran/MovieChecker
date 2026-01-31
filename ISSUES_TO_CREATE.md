# GitHub Issues to Create for MovieChecker

This document contains a comprehensive list of issues identified during code review. You can use this to create GitHub issues manually.

---

## 1. 🔒 Security: Hardcoded credentials in appsettings.json

**Type:** Bug / Security  
**Labels:** `security`, `high-priority`, `backend`

**Description:**
The `appsettings.json` file contains hardcoded database credentials that get committed to source control:

```json
"ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=moviechecker;Username=admin;Password=ewrwecsdr3qwrqwe"
}
```

**Suggested Fix:**
- Remove hardcoded credentials from `appsettings.json`
- Use `appsettings.Development.json` (which is gitignored) for local development
- Add a sample `appsettings.json.example` file with placeholder values

---

## 2. 🔒 Security: Default JWT secret key is weak and hardcoded

**Type:** Bug / Security  
**Labels:** `security`, `high-priority`, `backend`

**Description:**
The fallback JWT key in `DependencyInjection.cs` and `JwtService.cs` is a weak default value:
```csharp
var jwtKey = configuration["Jwt:Key"] ?? "SuperSecretKey12345678901234567890";
```

This hardcoded fallback should be removed to force proper configuration.

**Suggested Fix:**
- Throw an exception if JWT key is not configured instead of using fallback
- Add validation for minimum key length (at least 256 bits for HMAC-SHA256)

---

## 3. 📝 Documentation: README is nearly empty

**Type:** Enhancement / Documentation  
**Labels:** `documentation`, `good-first-issue`

**Description:**
The README.md file only contains `# MovieChecker` with no other content. It should include:
- Project description
- Features list
- Installation instructions
- Development setup guide
- API documentation overview
- Screenshots

**Suggested Fix:**
Add comprehensive README with installation, usage, and contribution guidelines.

---

## 4. 🐛 Bug: Missing input validation for registration

**Type:** Bug  
**Labels:** `bug`, `backend`, `security`

**Description:**
The registration endpoint in `AuthEndpoints.cs` doesn't validate:
- Username length/format (could be empty or extremely long)
- Password strength requirements
- DisplayName length

**Suggested Fix:**
Add validation using FluentValidation or manual checks:
```csharp
if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length < 3 || request.Username.Length > 50)
    return Results.BadRequest(new { message = "Username must be 3-50 characters" });
```

---

## 5. 🐛 Bug: Movie search is case-sensitive

**Type:** Bug  
**Labels:** `bug`, `backend`, `enhancement`

**Description:**
The movie search in `MovieEndpoints.cs` uses `Contains()` which is case-sensitive in PostgreSQL:
```csharp
.Where(m => m.Title.Contains(q) || (m.Description != null && m.Description.Contains(q)))
```

**Suggested Fix:**
Use case-insensitive search:
```csharp
.Where(m => EF.Functions.ILike(m.Title, $"%{q}%") || 
            (m.Description != null && EF.Functions.ILike(m.Description, $"%{q}%")))
```

---

## 6. 🐛 Bug: No pagination for API endpoints

**Type:** Bug / Enhancement  
**Labels:** `bug`, `enhancement`, `backend`, `performance`

**Description:**
Several endpoints return all results without pagination:
- `GET /api/movies` - returns all movies
- `GET /api/watch-entries` - returns all entries
- `GET /api/groups` - returns all groups

This could cause performance issues with large datasets.

**Suggested Fix:**
Add pagination parameters (page, pageSize) and return paginated results with metadata.

---

## 7. 🔧 Enhancement: Add database indexes for performance

**Type:** Enhancement  
**Labels:** `enhancement`, `backend`, `performance`

**Description:**
Missing database indexes for frequently queried columns:
- `Movie.Title` - for search queries
- `WatchEntry.Status` - for filtered queries
- `WatchEntry.GroupId` - for group-related queries
- `WatchEntry.UserId` - for user-specific queries

**Suggested Fix:**
Add indexes in entity configurations:
```csharp
builder.HasIndex(m => m.Title);
builder.HasIndex(w => w.Status);
```

---

## 8. 🐛 Bug: Potential null reference in GetUserId

**Type:** Bug  
**Labels:** `bug`, `backend`

**Description:**
The `GetUserId` helper method returns `0` when claim is missing:
```csharp
private static int GetUserId(ClaimsPrincipal user) =>
    int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
```

A userId of 0 is invalid and could cause authorization bypasses.

**Suggested Fix:**
Throw an exception or return an error result when the claim is missing.

---

## 9. 🔧 Enhancement: Add rate limiting to API endpoints

**Type:** Enhancement / Security  
**Labels:** `security`, `enhancement`, `backend`

**Description:**
No rate limiting is implemented, making the API vulnerable to:
- Brute force attacks on login
- DoS attacks
- Abuse of registration endpoint

**Suggested Fix:**
Implement rate limiting using ASP.NET Core rate limiting middleware.

---

## 10. 🔧 Enhancement: Add request logging/monitoring

**Type:** Enhancement  
**Labels:** `enhancement`, `backend`, `observability`

**Description:**
No structured logging or request monitoring is implemented. This makes debugging production issues difficult.

**Suggested Fix:**
- Add Serilog for structured logging
- Add request/response logging middleware
- Consider adding health check endpoints (already has basic `/api/health`)

---

## 11. 🐛 Bug: Storing images in database is inefficient

**Type:** Enhancement / Performance  
**Labels:** `enhancement`, `performance`, `backend`

**Description:**
Poster images are stored as `byte[]` in the database (`PosterImage` entity). This is inefficient for:
- Database size
- Backup/restore operations
- Caching

**Suggested Fix:**
Store images in file system or cloud storage (S3, Azure Blob) and save only the path/URL in database.

---

## 12. 🔧 Enhancement: Add unit tests for backend

**Type:** Enhancement  
**Labels:** `enhancement`, `testing`, `backend`

**Description:**
No unit tests exist for the backend. Critical business logic should be tested:
- Authentication logic
- Authorization checks
- Group membership validation
- Rating calculations

**Suggested Fix:**
Add xUnit test project with tests for endpoints and services.

---

## 13. 🔧 Enhancement: Add frontend tests

**Type:** Enhancement  
**Labels:** `enhancement`, `testing`, `frontend`

**Description:**
No tests exist for the frontend. Should add:
- Unit tests for utility functions
- Component tests with React Testing Library
- E2E tests with Playwright or Cypress

**Suggested Fix:**
Set up Jest and React Testing Library for component testing.

---

## 14. 🐛 Bug: TypeScript type mismatch for optional fields

**Type:** Bug  
**Labels:** `bug`, `frontend`

**Description:**
In `WatchEntry` interface, fields like `currentSeason`, `currentEpisode`, `totalEpisodes`, `watchingTime` are declared as required `number` but the backend returns them as nullable:
```typescript
currentSeason: number;  // Should be: number | null | undefined
currentEpisode: number;
totalEpisodes: number;
watchingTime: number;
```

**Suggested Fix:**
Update types to match backend response:
```typescript
currentSeason?: number | null;
currentEpisode?: number | null;
totalEpisodes?: number | null;
watchingTime?: number | null;
```

---

## 15. 🔧 Enhancement: Add error boundary component

**Type:** Enhancement  
**Labels:** `enhancement`, `frontend`, `user-experience`

**Description:**
No error boundary exists to catch React rendering errors. Unhandled errors crash the entire app.

**Suggested Fix:**
Add error boundary component to gracefully handle errors and show user-friendly error messages.

---

## 16. 🔧 Enhancement: Extract duplicate DTO mapping logic

**Type:** Enhancement / Refactoring  
**Labels:** `enhancement`, `refactoring`, `backend`

**Description:**
The `ToDto` mapping logic for `MovieDto` is duplicated across multiple endpoints:
```csharp
new MovieDto(m.Id, m.Title, m.Description, m.Type, m.Year, m.Genre, m.PosterUrl, m.CreatedAt)
```

**Suggested Fix:**
Create extension methods or use AutoMapper for consistent DTO mapping.

---

## 17. 🐛 Bug: Missing CSRF protection for state-changing operations

**Type:** Bug / Security  
**Labels:** `security`, `bug`, `backend`

**Description:**
While `DisableAntiforgery()` is explicitly called for upload endpoint, other endpoints don't have proper CSRF protection for state-changing operations when using cookies.

**Suggested Fix:**
Review CSRF protection needs and implement if using cookie-based authentication.

---

## 18. 🔧 Enhancement: Add OpenAPI/Swagger documentation

**Type:** Enhancement  
**Labels:** `enhancement`, `documentation`, `backend`

**Description:**
No API documentation exists. Adding OpenAPI documentation would help:
- Frontend developers
- Third-party integrations
- API testing

**Suggested Fix:**
Add Swashbuckle/Swagger to generate OpenAPI documentation automatically.

---

## 19. 🔧 Enhancement: Environment-specific configuration

**Type:** Enhancement  
**Labels:** `enhancement`, `infrastructure`

**Description:**
The docker-compose.yml contains hardcoded domain name `xui123qweqwe.org` and other configuration that should be environment variables:
```yaml
Cors__Origins__0: https://xui123qweqwe.org
NEXT_PUBLIC_API_URL: https://xui123qweqwe.org/api
```

**Suggested Fix:**
Use environment variables for all domain-specific configuration.

---

## 20. 🔧 Enhancement: Add CI/CD pipeline

**Type:** Enhancement  
**Labels:** `enhancement`, `infrastructure`, `devops`

**Description:**
No GitHub Actions workflow exists for:
- Running tests on PR
- Building Docker images
- Linting code
- Security scanning

**Suggested Fix:**
Add GitHub Actions workflows for CI/CD:
- Build and test workflow
- Docker image build on main branch
- Dependency vulnerability scanning

---

## Additional Minor Issues

### 21. Typo in translation key: "deleteSucess" should be "deleteSuccess"

**File:** `src/frontend/src/lib/i18n/en.ts` line 85
**Labels:** `bug`, `frontend`, `good-first-issue`

### 22. Hardcoded Russian text in page.tsx

**File:** `src/frontend/src/app/page.tsx` line 250
```tsx
<span className="ml-1">· {entry.watchingTime} мин</span>
```
Should use translation function.

**Labels:** `bug`, `frontend`, `i18n`

### 23. Empty MovieConfiguration class

**File:** `src/backend/MovieChecker.Infrastructure/Data/Configurations/MovieConfiguration.cs`
```csharp
public void Configure(EntityTypeBuilder<Movie> builder)
{
    // Empty
}
```
Should either add configuration or remove the empty class.

**Labels:** `enhancement`, `backend`, `cleanup`

### 24. DTOs should be in separate files

**File:** `src/backend/MovieChecker.Domain/Models/Dtos.cs`
All DTOs are in a single file. Consider splitting into separate files for better maintainability.

**Labels:** `enhancement`, `refactoring`, `backend`

### 25. Missing .gitignore for pgadmin files

Referenced in docker-compose but not in repository:
```yaml
- ./pgadmin/servers.json:/pgadmin4/servers.json:ro
- ./pgadmin/pgpass:/pgpass:ro
```

**Labels:** `bug`, `infrastructure`

---

## Summary

| Priority | Count |
|----------|-------|
| Security | 4 |
| Bug | 8 |
| Enhancement | 12 |
| Documentation | 1 |

Total: **20 main issues + 5 minor issues**
