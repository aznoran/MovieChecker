using StackExchange.Redis;
using System.Security.Cryptography;

namespace MovieChecker.Infrastructure.Services;

public class OtpService
{
    private readonly IDatabase _redis;
    private const int OtpLength = 6;
    private const int OtpExpirationMinutes = 30;

    public OtpService(IConnectionMultiplexer redis)
    {
        _redis = redis.GetDatabase();
    }

    /// <summary>
    /// Generates a 6-digit OTP code for a group
    /// </summary>
    public async Task<(string Code, DateTime ExpiresAt)> GenerateOtpAsync(int groupId)
    {
        var code = GenerateRandomCode();
        var key = GetOtpKey(groupId, code);
        var expiresAt = DateTime.UtcNow.AddMinutes(OtpExpirationMinutes);
        
        // Store OTP in Redis with expiration
        await _redis.StringSetAsync(key, "valid", TimeSpan.FromMinutes(OtpExpirationMinutes));
        
        return (code, expiresAt);
    }

    /// <summary>
    /// Validates an OTP code for a group
    /// </summary>
    public async Task<bool> ValidateOtpAsync(int groupId, string code)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length != OtpLength)
            return false;

        // Validate that code contains only digits
        if (!code.All(char.IsDigit))
            return false;

        var key = GetOtpKey(groupId, code);
        var exists = await _redis.KeyExistsAsync(key);
        
        if (exists)
        {
            // Consume the OTP (delete it after use)
            await _redis.KeyDeleteAsync(key);
            return true;
        }
        
        return false;
    }

    private string GenerateRandomCode()
    {
        var code = "";
        for (int i = 0; i < OtpLength; i++)
        {
            code += RandomNumberGenerator.GetInt32(0, 10).ToString();
        }
        return code;
    }

    private string GetOtpKey(int groupId, string code)
    {
        return $"otp:group:{groupId}:{code}";
    }
}
