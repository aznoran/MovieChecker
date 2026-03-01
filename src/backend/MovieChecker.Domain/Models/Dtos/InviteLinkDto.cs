namespace MovieChecker.Domain.Models.Dtos;

public record InviteLinkDto(
    int Id,
    string Token,
    string Url,
    DateTime? ExpiresAt,
    int? MaxUses,
    int UseCount,
    DateTime CreatedAt
);
