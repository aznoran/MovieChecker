namespace MovieChecker.Domain.Models.Dtos;

public record UpdateUserSettingsRequest(
    bool? PreventOthersAddingToMyPersonal,
    bool? PreventMeAddingToMyPersonal,
    string? CardSize,
    bool? HasSeenTranslateHint
);
