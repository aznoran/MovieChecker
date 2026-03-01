using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record CreateGroupRequest(string Name, bool IsPrivate = false, GroupRole? DefaultRole = null);
