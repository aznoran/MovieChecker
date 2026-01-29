using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
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

        group.MapPost("/poster", UploadPoster).DisableAntiforgery();

        // Public endpoint — no auth required to fetch images
        app.MapGet("/api/posters/{id:int}", GetPoster);
    }

    private static async Task<IResult> UploadPoster(IFormFile file, AppDbContext db)
    {
        if (file.Length == 0)
            return Results.BadRequest(new { message = "No file provided" });

        if (file.Length > MaxFileSize)
            return Results.BadRequest(new { message = "File too large. Max 5MB." });

        if (!AllowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
            return Results.BadRequest(new { message = "Invalid file type. Allowed: jpg, png, webp, gif" });

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

        return Results.Ok(new { id = poster.Id });
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
