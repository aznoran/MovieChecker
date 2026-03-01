namespace MovieChecker.Infrastructure.Auth;

public static class MovieCheckerPermissions
{
    public const string AdminPanel  = "admin.panel";
    public const string ManageUsers = "users.manage";
    public static readonly IReadOnlyList<string> All = [AdminPanel, ManageUsers];
}
