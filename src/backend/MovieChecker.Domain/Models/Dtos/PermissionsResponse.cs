namespace MovieChecker.Domain.Models.Dtos;

public record PermissionsResponse(
    int PermissionFlags,
    bool CanViewEntries,
    bool CanCreateEntries,
    bool CanEditOwnEntries,
    bool CanEditAllEntries,
    bool CanDeleteOwnEntries,
    bool CanDeleteAllEntries,
    bool CanRateSelf,
    bool CanRateOthers,
    bool CanManageMembers,
    bool CanManageGroup
);
