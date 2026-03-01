namespace MovieChecker.Domain.Models.Dtos;

public record JoinGroupRequest(string InviteCode, string? Otp = null, string? InviteLinkToken = null);
