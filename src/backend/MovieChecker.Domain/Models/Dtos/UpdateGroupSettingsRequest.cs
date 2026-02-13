namespace MovieChecker.Domain.Models.Dtos;

public record UpdateGroupSettingsRequest(string? Name = null, bool? IsPrivate = null);
