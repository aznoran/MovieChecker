using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record GroupMemberDto(
    Guid UserId,
    string DisplayName,
    GroupRole Role,
    DateTime JoinedAt,
    bool HasCustomPermissions
);
