# TMDB and AniList Integration

This document describes the external content database integration added to MovieChecker.

## Features

- **TMDB Integration**: Search for movies, TV shows, and cartoons from The Movie Database
- **AniList Integration**: Search for anime from AniList
- **Auto-fill**: Select a content card to automatically populate the form with title, description, year, genres, and poster
- **Caching**: API responses are cached in Redis for 1 hour to reduce API calls
- **Debounced Search**: Search input is debounced by 500ms to reduce unnecessary API calls

## Setup

### Backend Configuration

1. **Get a TMDB API Key**:
   - Go to https://www.themoviedb.org/settings/api
   - Sign up or log in
   - Request an API key
   - Copy your API key

2. **Configure the API Key**:
   
   Add your TMDB API key to the `.env` file in the project root:
   ```bash
   TMDB_API_KEY=your_api_key_here
   ```

   Or set it as an environment variable:
   ```bash
   export TMDB_API_KEY=your_api_key_here
   ```

   The backend will read this from `ExternalApis:Tmdb:ApiKey` configuration.

3. **Apply Database Migration**:
   
   The Movie entity has been updated with `TmdbId` and `AnilistId` fields. You need to create and apply a migration:
   
   ```bash
   cd src/backend/MovieChecker.Web
   dotnet ef migrations add AddExternalIdsToMovie
   dotnet ef database update
   ```

4. **AniList**:
   - AniList uses a public GraphQL API
   - No API key is required

### Frontend

No additional configuration needed. The frontend will automatically use the backend API endpoints.

## Usage

1. **Open Add Entry Dialog**: Click the "+" button to create a new entry

2. **Click "Search External Databases"**: This will show the external search interface

3. **Choose Source**:
   - **TMDB** tab: For movies, TV shows, cartoons
   - **AniList** tab: For anime

4. **Search**: Type at least 2 characters to search

5. **Select Content**: Click on a content card to auto-fill the form

6. **Review and Submit**: The form will be populated with:
   - Title
   - Description (HTML tags stripped)
   - Year
   - Genres
   - Poster (external URL, no upload needed)
   - External ID (tmdbId or anilistId)

## API Endpoints

### TMDB Endpoints

- `GET /api/external/tmdb/search?query={query}&page={page}`
  - Search for movies and TV shows
  - Returns: `ExternalSearchResponse`

- `GET /api/external/tmdb/movie/{tmdbId}`
  - Get detailed movie information
  - Returns: `ExternalContentResult`

- `GET /api/external/tmdb/tv/{tmdbId}`
  - Get detailed TV show information
  - Returns: `ExternalContentResult`

### AniList Endpoints

- `GET /api/external/anilist/search?query={query}&page={page}`
  - Search for anime
  - Returns: `ExternalSearchResponse`

- `GET /api/external/anilist/anime/{anilistId}`
  - Get detailed anime information
  - Returns: `ExternalContentResult`

## Data Models

### ExternalContentResult

```typescript
{
  externalId: string;
  source: 'tmdb' | 'anilist';
  title: string;
  description?: string;
  posterUrl?: string;
  year?: number;
  genres?: string;
  type: ContentType;
  rating?: number;
  episodes?: number;
  seasons?: number;
}
```

### Movie Entity (Updated)

```csharp
public class Movie
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string? Description { get; set; }
    public ContentType Type { get; set; }
    public int? Year { get; set; }
    public string? Genre { get; set; }
    public string? PosterUrl { get; set; }
    public string? TmdbId { get; set; }       // NEW
    public string? AnilistId { get; set; }    // NEW
    public DateTime CreatedAt { get; set; }
}
```

## Caching Strategy

- **Redis Cache**: All external API responses are cached in Redis
- **Cache Duration**: 1 hour for search results, 10 hours for detail queries
- **Cache Keys**:
  - Search: `tmdb:search:{query}:{page}` or `anilist:search:{query}:{page}`
  - Details: `tmdb:movie:{id}`, `tmdb:tv:{id}`, `anilist:anime:{id}`

## Error Handling

- If TMDB API key is missing, searches will return empty results
- API failures are logged and return empty results to the user
- User-friendly error messages are displayed for network failures
- Empty state is shown when no results are found

## UI Components

### ExternalContentSearch
Main search interface with tabs for TMDB and AniList.

### ExternalContentCard
Displays a content card with:
- Poster image
- Title
- Year and rating
- Episodes/seasons count
- Genres
- Description preview
- Source badge (TMDB/ANILIST)

## Performance Considerations

- **Debounced Search**: 500ms delay prevents excessive API calls while typing
- **Redis Caching**: Reduces repeated API calls for the same queries
- **Lazy Loading**: Poster images are loaded only when visible
- **Pagination**: Search results are paginated (20 per page)

## Security

- API keys are stored in environment variables, not in code
- External API calls are made server-side only
- Rate limiting is handled via Redis caching
- All endpoints require authentication

## Future Enhancements

- [ ] Add keyboard navigation (arrow keys, enter to select)
- [ ] Add more accessibility features (ARIA labels)
- [ ] Add support for more content types
- [ ] Add trending/popular content suggestions
- [ ] Add content recommendations based on watch history
