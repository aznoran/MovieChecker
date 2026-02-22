namespace MovieChecker.Domain.Models.Dtos;

public record GroupInfoResponse(
    bool Exists,
    bool IsPrivate,
    string? GroupName
);
