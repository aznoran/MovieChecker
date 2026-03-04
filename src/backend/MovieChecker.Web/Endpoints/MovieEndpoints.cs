using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class MovieEndpoints
{
    public static void MapMovieEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/movies").RequireAuthorization();

        group.MapGet("/", GetAll)
            .Produces<List<MovieDto>>(StatusCodes.Status200OK)
            .WithSummary("Get all movies")
            .WithDescription("Returns a list of all movies, optionally filtered by type");

        group.MapGet("/{id:int}", GetById)
            .Produces<MovieDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Get movie by ID")
            .WithDescription("Returns a single movie by its ID");

        group.MapPost("/", Create)
            .Produces<MovieDto>(StatusCodes.Status201Created)
            .WithSummary("Create a new movie")
            .WithDescription("Creates a new movie entry");

        group.MapPut("/{id:int}", Update)
            .Produces<MovieDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Update a movie")
            .WithDescription("Updates an existing movie");

        group.MapDelete("/{id:int}", Delete)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Delete a movie")
            .WithDescription("Deletes a movie by its ID");

        group.MapGet("/search", Search)
            .Produces<List<MovieDto>>(StatusCodes.Status200OK)
            .WithSummary("Search movies")
            .WithDescription("Searches movies by title or description");
    }

    private static async Task<IResult> GetAll(AppDbContext db, int? type = null)
    {
        var query = db.Movies.AsQueryable();

        if (type.HasValue)
        {
            query = query.Where(m => m.Type == (EntryContentType)type.Value);
        }

        var movies = await query
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new MovieDto(
                m.Id,
                m.Title,
                m.Description,
                m.Type,
                m.Year,
                m.Genre,
                m.PosterUrl,
                m.TmdbId,
                m.AnilistId,
                m.IsCustom,
                m.CreatedAt
            ))
            .ToListAsync();

        return Results.Ok(movies);
    }

    private static async Task<IResult> GetById(int id, AppDbContext db)
    {
        var movie = await db.Movies.FindAsync(id);
        if (movie == null)
        {
            return Results.NotFound();
        }

        return Results.Ok(new MovieDto(
            movie.Id,
            movie.Title,
            movie.Description,
            movie.Type,
            movie.Year,
            movie.Genre,
            movie.PosterUrl,
            movie.TmdbId,
            movie.AnilistId,
            movie.IsCustom,
            movie.CreatedAt
        ));
    }

    private static async Task<IResult> Create(CreateMovieRequest request, AppDbContext db)
    {
        // Validate field lengths
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 255)
            return Results.BadRequest(new ErrorResponse("Title is required and must not exceed 255 characters"));
        if (request.Description != null && request.Description.Length > 2500)
            return Results.BadRequest(new ErrorResponse("Description must not exceed 2500 characters"));
        if (request.Genre != null && request.Genre.Length > 500)
            return Results.BadRequest(new ErrorResponse("Genre must not exceed 500 characters"));

        var movie = new Movie
        {
            Title = request.Title,
            Description = request.Description,
            Type = request.Type,
            Year = request.Year,
            Genre = request.Genre,
            PosterUrl = request.PosterUrl,
            TmdbId = request.TmdbId,
            AnilistId = request.AnilistId,
            IsCustom = request.IsCustom
        };

        db.Movies.Add(movie);
        await db.SaveChangesAsync();

        return Results.Created($"/api/movies/{movie.Id}", new MovieDto(
            movie.Id,
            movie.Title,
            movie.Description,
            movie.Type,
            movie.Year,
            movie.Genre,
            movie.PosterUrl,
            movie.TmdbId,
            movie.AnilistId,
            movie.IsCustom,
            movie.CreatedAt
        ));
    }

    private static async Task<IResult> Update(int id, UpdateMovieRequest request, AppDbContext db)
    {
        var movie = await db.Movies.FindAsync(id);
        if (movie == null)
        {
            return Results.NotFound();
        }

        if (request.Title != null) movie.Title = request.Title;
        if (request.Description != null) movie.Description = request.Description;
        if (request.Type.HasValue) movie.Type = request.Type.Value;
        if (request.Year.HasValue) movie.Year = request.Year.Value;
        if (request.Genre != null) movie.Genre = request.Genre;
        if (request.PosterUrl != null)
        {
            var oldPosterUrl = movie.PosterUrl;
            movie.PosterUrl = string.IsNullOrEmpty(request.PosterUrl) ? null : request.PosterUrl;
            
            // Clean up old poster image from database
            if (!string.IsNullOrEmpty(oldPosterUrl) && oldPosterUrl != movie.PosterUrl 
                && int.TryParse(oldPosterUrl, out var oldPosterId))
            {
                var oldPoster = await db.PosterImages.FindAsync(oldPosterId);
                if (oldPoster != null) db.PosterImages.Remove(oldPoster);
            }
        }

        await db.SaveChangesAsync();

        return Results.Ok(new MovieDto(
            movie.Id,
            movie.Title,
            movie.Description,
            movie.Type,
            movie.Year,
            movie.Genre,
            movie.PosterUrl,
            movie.TmdbId,
            movie.AnilistId,
            movie.IsCustom,
            movie.CreatedAt
        ));
    }

    private static async Task<IResult> Delete(int id, AppDbContext db)
    {
        var movie = await db.Movies.FindAsync(id);
        if (movie == null)
        {
            return Results.NotFound();
        }

        // Clean up poster image from database
        if (!string.IsNullOrEmpty(movie.PosterUrl) && int.TryParse(movie.PosterUrl, out var posterId))
        {
            var poster = await db.PosterImages.FindAsync(posterId);
            if (poster != null) db.PosterImages.Remove(poster);
        }

        db.Movies.Remove(movie);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }

    private static async Task<IResult> Search(string q, AppDbContext db)
    {
        var movies = await db.Movies
            .Where(m => m.Title.Contains(q) || (m.Description != null && m.Description.Contains(q)))
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new MovieDto(
                m.Id,
                m.Title,
                m.Description,
                m.Type,
                m.Year,
                m.Genre,
                m.PosterUrl,
                m.TmdbId,
                m.AnilistId,
                m.IsCustom,
                m.CreatedAt
            ))
            .ToListAsync();

        return Results.Ok(movies);
    }
}
