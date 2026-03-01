using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record GroupDto(
    int Id,
    string Name,
    string? InviteCode,
    Guid CreatedByUserId,
    bool IsPrivate,
    GroupType GroupType,
    GroupRole DefaultRole,
    List<GroupMemberDto> Members,
    DateTime CreatedAt
);
