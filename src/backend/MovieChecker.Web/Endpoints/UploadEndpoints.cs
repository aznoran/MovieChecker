using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Infrastructure.Abstractions;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class UploadEndpoints
{
    private static readonly string[] AllowedContentTypes =
        ["image/jpeg", "image/png", "image/webp", "image/gif"];
    private const long MaxFileSize = 5 * 1024 * 1024; // 5MB

    public static void MapUploadEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/upload").RequireAuthorization();

        group.MapPost("/poster", UploadPoster)
            .DisableAntiforgery()
            .Produces<UploadPosterResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .WithSummary("Upload a poster image")
            .WithDescription("Uploads a poster image (max 5MB, jpg/png/webp/gif)");

        // Public endpoint — no auth required to fetch images
        app.MapGet("/api/posters/{id:int}", GetPoster)
            .Produces(StatusCodes.Status200OK, contentType: "image/jpeg", additionalContentTypes: ["image/png", "image/webp", "image/gif"])
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Get a poster image")
            .WithDescription("Returns a poster image by its ID");
    }

    private static async Task<IResult> UploadPoster(IFormFile file, AppDbContext db, ILocalizationService localizer)
    {
        if (file.Length == 0)
            return Results.BadRequest(new ErrorResponse(localizer["NoFileProvided"]));

        if (file.Length > MaxFileSize)
            return Results.BadRequest(new ErrorResponse(localizer["FileTooLarge"]));

        if (!AllowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
            return Results.BadRequest(new ErrorResponse(localizer["InvalidFileType"]));

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);

        var poster = new PosterImage
        {
            FileName = file.FileName,
            ContentType = file.ContentType,
            Data = ms.ToArray()
        };

        db.PosterImages.Add(poster);
        await db.SaveChangesAsync();

        return Results.Ok(new UploadPosterResponse(poster.Id));
    }

    private static async Task<IResult> GetPoster(int id, AppDbContext db)
    {
        var poster = await db.PosterImages
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (poster == null)
            return Results.NotFound();

        return Results.File(poster.Data, poster.ContentType, poster.FileName);
    }
}
