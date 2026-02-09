namespace MovieChecker.Domain.Models.Dtos;

public record UserSettingsDto(
    bool PreventOthersAddingToMyPersonal,
    bool PreventMeAddingToMyPersonal
);
