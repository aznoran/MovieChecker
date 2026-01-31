using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class MovieEndpoints
{
    public static void MapMovieEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/movies")
            .RequireAuthorization()
            .WithTags("Movies");

        group.MapGet("/", GetAll)
            .WithDescription("Get all movies, optionally filtered by type");
        
        group.MapGet("/{id:int}", GetById)
            .WithDescription("Get a movie by ID");
        
        group.MapPost("/", Create)
            .WithDescription("Create a new movie");
        
        group.MapPut("/{id:int}", Update)
            .WithDescription("Update an existing movie");
        
        group.MapDelete("/{id:int}", Delete)
            .WithDescription("Delete a movie");
        
        group.MapGet("/search", Search)
            .WithDescription("Search movies by title or description");
    }

    private static async Task<IResult> GetAll(AppDbContext db, int? type = null)
    {
        var query = db.Movies.AsQueryable();

        if (type.HasValue)
        {
            query = query.Where(m => m.Type == (ContentType)type.Value);
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
            movie.CreatedAt
        ));
    }

    private static async Task<IResult> Create(CreateMovieRequest request, AppDbContext db)
    {
        var movie = new Movie
        {
            Title = request.Title,
            Description = request.Description,
            Type = request.Type,
            Year = request.Year,
            Genre = request.Genre,
            PosterUrl = request.PosterUrl
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
        if (request.PosterUrl != null) movie.PosterUrl = request.PosterUrl;

        await db.SaveChangesAsync();

        return Results.Ok(new MovieDto(
            movie.Id,
            movie.Title,
            movie.Description,
            movie.Type,
            movie.Year,
            movie.Genre,
            movie.PosterUrl,
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
                m.CreatedAt
            ))
            .ToListAsync();

        return Results.Ok(movies);
    }
}
