namespace MovieChecker.Domain.Models.Dtos;

public record GroupInfoResponse(
    bool Exists,
    bool IsPrivate,
    bool HasPassword,
    string? GroupName
);
