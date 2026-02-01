namespace MovieChecker.Domain.Models.Dtos;

/// <summary>
/// Validation error response with translated message and list of validation errors
/// </summary>
public record ValidationErrorResponse(string Message, List<ValidationError> Errors);
