namespace MovieChecker.Infrastructure.Auth;

public static class RolePermissions
{
    private static readonly Dictionary<string, HashSet<string>> _mapping = new()
    {
        [MovieCheckerRoles.Participant]   = [],
        [MovieCheckerRoles.Moderator]     = [MovieCheckerPermissions.ManageUsers],
        [MovieCheckerRoles.Administrator] = [.. MovieCheckerPermissions.All],
    };

    public static HashSet<string> GetPermissions(IEnumerable<string> groups)
    {
        var perms = new HashSet<string>();
        foreach (var g in groups)
            if (_mapping.TryGetValue(g, out var p)) perms.UnionWith(p);
        return perms;
    }
}
