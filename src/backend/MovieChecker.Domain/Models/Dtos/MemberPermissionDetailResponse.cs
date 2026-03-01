namespace MovieChecker.Domain.Models.Dtos;

public sealed record MemberPermissionDetailResponse(
    int RoleDefaultFlags,
    int GrantedPermissionsFlags,
    int RevokedPermissionsFlags,
    int EffectivePermissionsFlags,
    bool CanViewEntries,
    bool CanCreateEntries,
    bool CanEditOwnEntries,
    bool CanEditAllEntries,
    bool CanDeleteOwnEntries,
    bool CanDeleteAllEntries,
    bool CanRateSelf,
    bool CanRateOthers,
    bool CanManageMembers,
    bool CanManageGroup,
    bool HasCustomPermissions
);
