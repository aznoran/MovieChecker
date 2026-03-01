namespace MovieChecker.Domain.Models.Dtos;

public sealed record UpdateMemberPermissionsRequest(int GrantedPermissions, int RevokedPermissions);
