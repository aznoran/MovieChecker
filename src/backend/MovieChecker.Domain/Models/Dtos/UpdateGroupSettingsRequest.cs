using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record UpdateGroupSettingsRequest(string? Name = null, bool? IsPrivate = null, GroupRole? DefaultRole = null);
