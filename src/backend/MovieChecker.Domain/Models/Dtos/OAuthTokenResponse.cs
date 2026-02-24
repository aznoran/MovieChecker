namespace MovieChecker.Domain.Models.Dtos;

public record OAuthTokenResponse(
    string AccessToken,
    string? RefreshToken,
    int ExpiresIn,
    string TokenType
);
