namespace MovieChecker.Domain.Models.Dtos;

public record JoinGroupRequest(string InviteCode, string? Password = null, string? Otp = null);
