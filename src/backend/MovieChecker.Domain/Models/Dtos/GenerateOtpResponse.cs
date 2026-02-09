namespace MovieChecker.Domain.Models.Dtos;

public record GenerateOtpResponse(string Code, DateTime ExpiresAt);
