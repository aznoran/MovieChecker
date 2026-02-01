namespace MovieChecker.Infrastructure.Services;

public static class InviteCodeService
{
    private const string Chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    
    /// <summary>
    /// Generates a random 8-character invite code using alphanumeric characters.
    /// Excludes easily confused characters (I, O, 0, 1, L).
    /// </summary>
    public static string GenerateInviteCode()
    {
        return new string(Enumerable.Range(0, 8)
            .Select(_ => Chars[Random.Shared.Next(Chars.Length)])
            .ToArray());
    }
}
