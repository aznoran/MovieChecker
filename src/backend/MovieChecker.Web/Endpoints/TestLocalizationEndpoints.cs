using Microsoft.Extensions.Localization;
using MovieChecker.Infrastructure.Abstractions;

namespace MovieChecker.Web.Endpoints;

public static class TestLocalizationEndpoints
{
    public static void MapTestLocalizationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/test-localization");

        group.MapGet("/all-errors", (ILocalizationService localizer) =>
        {
            var errors = new Dictionary<string, string>
            {
                ["InsufficientPermissionsCreate"] = localizer["InsufficientPermissionsCreate"],
                ["InsufficientPermissionsUpdate"] = localizer["InsufficientPermissionsUpdate"],
                ["InsufficientPermissionsDelete"] = localizer["InsufficientPermissionsDelete"],
                ["InsufficientPermissionsRead"] = localizer["InsufficientPermissionsRead"],
                ["EntryNotFound"] = localizer["EntryNotFound"],
                ["MovieNotFound"] = localizer["MovieNotFound"],
                ["GroupNotFound"] = localizer["GroupNotFound"],
                ["UserNotFound"] = localizer["UserNotFound"],
                ["InvalidMovieData"] = localizer["InvalidMovieData"],
                ["InvalidGroupData"] = localizer["InvalidGroupData"],
                ["InvalidEntryData"] = localizer["InvalidEntryData"],
                ["InvalidUserData"] = localizer["InvalidUserData"],
                ["DuplicateEntry"] = localizer["DuplicateEntry"],
                ["DuplicateGroup"] = localizer["DuplicateGroup"],
                ["DuplicateUser"] = localizer["DuplicateUser"],
                ["InvalidCredentials"] = localizer["InvalidCredentials"],
                ["UserAlreadyExists"] = localizer["UserAlreadyExists"],
                ["InvalidToken"] = localizer["InvalidToken"],
                ["TokenExpired"] = localizer["TokenExpired"],
                ["InvalidFileType"] = localizer["InvalidFileType"],
                ["FileTooLarge"] = localizer["FileTooLarge"],
                ["UploadFailed"] = localizer["UploadFailed"],
                ["DatabaseError"] = localizer["DatabaseError"],
                ["UnexpectedError"] = localizer["UnexpectedError"],
                ["ValidationError"] = localizer["ValidationError"],
                ["InvalidOperation"] = localizer["InvalidOperation"],
                ["ResourceLocked"] = localizer["ResourceLocked"],
                ["RateLimitExceeded"] = localizer["RateLimitExceeded"]
            };

            return Results.Ok(new
            {
                culture = System.Globalization.CultureInfo.CurrentCulture.Name,
                uiCulture = System.Globalization.CultureInfo.CurrentUICulture.Name,
                errors
            });
        });

        group.MapGet("/test-error/{key}", (string key, ILocalizationService localizer) =>
        {
            var translatedValue = localizer[key];
            var isFound = localizer[key];

            return Results.Ok(new
            {
                key,
                translatedValue,
                isFound,
                culture = System.Globalization.CultureInfo.CurrentCulture.Name,
                uiCulture = System.Globalization.CultureInfo.CurrentUICulture.Name
            });
        });
    }
}
