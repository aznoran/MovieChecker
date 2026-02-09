namespace MovieChecker.Domain.Models.Dtos;

public record ValidationResult(bool IsValid, List<ValidationError> Errors);
