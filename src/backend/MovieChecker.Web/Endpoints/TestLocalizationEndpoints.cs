using MovieChecker.Infrastructure.Abstractions;

namespace MovieChecker.Web.Endpoints;

public static class TestLocalizationEndpoints
{
    public static void MapTestLocalizationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/test-localization")
            .WithTags("Test Localization");

        group.MapGet("/all-errors", (ILocalizationService localizer) =>
        {
            var errors = new Dictionary<string, string>
            {
                // Permission errors
                ["InsufficientPermissionsCreate"] = localizer["InsufficientPermissionsCreate"],
                ["InsufficientPermissionsEdit"] = localizer["InsufficientPermissionsEdit"],
                ["InsufficientPermissionsDelete"] = localizer["InsufficientPermissionsDelete"],
                ["InsufficientPermissionsView"] = localizer["InsufficientPermissionsView"],
                ["InsufficientPermissionsViewEntry"] = localizer["InsufficientPermissionsViewEntry"],
                ["InsufficientPermissionsRate"] = localizer["InsufficientPermissionsRate"],
                ["InsufficientPermissionsStats"] = localizer["InsufficientPermissionsStats"],
                ["InsufficientPermissionsRemove"] = localizer["InsufficientPermissionsRemove"],
                ["InsufficientPermissionsChangeRole"] = localizer["InsufficientPermissionsChangeRole"],
                ["InsufficientPermissionsOtp"] = localizer["InsufficientPermissionsOtp"],
                ["InsufficientPermissionsPassword"] = localizer["InsufficientPermissionsPassword"],
                // Not found errors
                ["MovieNotFound"] = localizer["MovieNotFound"],
                // Duplicate errors
                ["EntryAlreadyExistsGroup"] = localizer["EntryAlreadyExistsGroup"],
                ["EntryAlreadyExists"] = localizer["EntryAlreadyExists"],
                ["AlreadyMember"] = localizer["AlreadyMember"],
                // Group management errors
                ["OnlyOwnerTransfer"] = localizer["OnlyOwnerTransfer"],
                ["MustBeMember"] = localizer["MustBeMember"],
                ["CannotRemoveOwner"] = localizer["CannotRemoveOwner"],
                ["CannotChangeOwnerRole"] = localizer["CannotChangeOwnerRole"],
                ["AdminsCannotModify"] = localizer["AdminsCannotModify"],
                ["UseTransferOwnership"] = localizer["UseTransferOwnership"],
                ["UserNotGroupMember"] = localizer["UserNotGroupMember"],
                // OTP and password errors
                ["InvalidOrExpiredOtp"] = localizer["InvalidOrExpiredOtp"],
                ["PasswordOrOtpRequired"] = localizer["PasswordOrOtpRequired"],
                ["OtpOnlyGroup"] = localizer["OtpOnlyGroup"],
                ["OtpOnlyForPrivate"] = localizer["OtpOnlyForPrivate"],
                ["OnlyPrivateGroupsPassword"] = localizer["OnlyPrivateGroupsPassword"],
                ["PasswordUpdatedSuccessfully"] = localizer["PasswordUpdatedSuccessfully"],
                // Auth errors
                ["ValidationFailed"] = localizer["ValidationFailed"],
                ["UsernameAlreadyExists"] = localizer["UsernameAlreadyExists"],
                ["InvalidInviteCode"] = localizer["InvalidInviteCode"],
                // File upload errors
                ["NoFileProvided"] = localizer["NoFileProvided"],
                ["FileTooLarge"] = localizer["FileTooLarge"],
                ["InvalidFileType"] = localizer["InvalidFileType"]
            };

            return Results.Ok(new
            {
                culture = System.Globalization.CultureInfo.CurrentCulture.Name,
                uiCulture = System.Globalization.CultureInfo.CurrentUICulture.Name,
                errors
            });
        })
        .WithDescription("Get all error message translations");

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
        })
        .WithDescription("Test a specific error message translation");
    }
}
