using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record GroupDto(
    int Id,
    string Name,
    string InviteCode,
    int CreatedByUserId,
    bool IsPrivate,
    GroupRole DefaultRole,
    List<GroupMemberDto> Members,
    DateTime CreatedAt
);
