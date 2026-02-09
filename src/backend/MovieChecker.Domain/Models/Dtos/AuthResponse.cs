namespace MovieChecker.Domain.Models.Dtos;

public record AuthResponse(string Token, UserDto User);
