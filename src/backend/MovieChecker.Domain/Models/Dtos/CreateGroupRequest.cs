using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record CreateGroupRequest(string Name, bool IsPrivate = false, string? Password = null, GroupRole? DefaultRole = null);
