namespace MovieChecker.Domain.Models.Dtos;

public record UserRatingInput(Guid UserId, int Rating);
