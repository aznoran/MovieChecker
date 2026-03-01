namespace MovieChecker.Domain.Models.Dtos;

public record CreateInviteLinkRequest(int? ExpiresInMinutes = null, int? MaxUses = null);
