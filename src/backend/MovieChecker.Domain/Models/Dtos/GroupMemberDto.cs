using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record GroupMemberDto(
    int UserId,
    string DisplayName,
    GroupRole Role,
    DateTime JoinedAt,
    bool HasCustomPermissions
);
