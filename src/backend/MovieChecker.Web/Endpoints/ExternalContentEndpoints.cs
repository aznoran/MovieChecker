using Microsoft.AspNetCore.Mvc;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Infrastructure.Abstractions;

namespace MovieChecker.Web.Endpoints;

public static class ExternalContentEndpoints
{
    public static void MapExternalContentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/external")
            .RequireAuthorization()
            .WithTags("External Content");

        group.MapGet("/tmdb/search", SearchTmdb)
            .WithName("SearchTmdb")
            .WithSummary("Search for movies and TV shows in TMDB")
            .WithDescription("Search TMDB database for movies, TV shows, and cartoons")
            .Produces<ExternalSearchResponse>();

        group.MapGet("/tmdb/movie/{tmdbId}", GetTmdbMovieDetails)
            .WithName("GetTmdbMovieDetails")
            .WithSummary("Get detailed movie information from TMDB")
            .WithDescription("Fetch detailed information about a specific movie from TMDB by its ID")
            .Produces<ExternalContentResult>()
            .Produces(404);

        group.MapGet("/tmdb/tv/{tmdbId}", GetTmdbTvDetails)
            .WithName("GetTmdbTvDetails")
            .WithSummary("Get detailed TV show information from TMDB")
            .WithDescription("Fetch detailed information about a specific TV show from TMDB by its ID")
            .Produces<ExternalContentResult>()
            .Produces(404);

        group.MapGet("/anilist/search", SearchAniList)
            .WithName("SearchAniList")
            .WithSummary("Search for anime in AniList")
            .WithDescription("Search AniList database for anime content")
            .Produces<ExternalSearchResponse>();

        group.MapGet("/anilist/anime/{anilistId}", GetAniListAnimeDetails)
            .WithName("GetAniListAnimeDetails")
            .WithSummary("Get detailed anime information from AniList")
            .WithDescription("Fetch detailed information about a specific anime from AniList by its ID")
            .Produces<ExternalContentResult>()
            .Produces(404);
    }

    private static async Task<IResult> SearchTmdb(
        [FromQuery] string query,
        [FromQuery] int page,
        [FromServices] ITmdbService tmdbService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Results.BadRequest(new ErrorResponse("Query parameter is required"));
        }

        if (page < 1)
        {
            page = 1;
        }

        var result = await tmdbService.SearchAsync(query, page, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetTmdbMovieDetails(
        [FromRoute] string tmdbId,
        [FromServices] ITmdbService tmdbService,
        CancellationToken cancellationToken)
    {
        var result = await tmdbService.GetMovieDetailsAsync(tmdbId, cancellationToken);
        
        if (result == null)
        {
            return Results.NotFound(new ErrorResponse("Movie not found"));
        }

        return Results.Ok(result);
    }

    private static async Task<IResult> GetTmdbTvDetails(
        [FromRoute] string tmdbId,
        [FromServices] ITmdbService tmdbService,
        CancellationToken cancellationToken)
    {
        var result = await tmdbService.GetTvDetailsAsync(tmdbId, cancellationToken);
        
        if (result == null)
        {
            return Results.NotFound(new ErrorResponse("TV show not found"));
        }

        return Results.Ok(result);
    }

    private static async Task<IResult> SearchAniList(
        [FromQuery] string query,
        [FromQuery] int page,
        [FromServices] IAniListService aniListService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Results.BadRequest(new ErrorResponse("Query parameter is required"));
        }

        if (page < 1)
        {
            page = 1;
        }

        var result = await aniListService.SearchAsync(query, page, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetAniListAnimeDetails(
        [FromRoute] string anilistId,
        [FromServices] IAniListService aniListService,
        CancellationToken cancellationToken)
    {
        var result = await aniListService.GetAnimeDetailsAsync(anilistId, cancellationToken);
        
        if (result == null)
        {
            return Results.NotFound(new ErrorResponse("Anime not found"));
        }

        return Results.Ok(result);
    }
}
