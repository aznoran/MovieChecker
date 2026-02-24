using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MovieChecker.Infrastructure.Services;

public class AuthentikOAuthService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthentikOAuthService> _logger;

    public AuthentikOAuthService(HttpClient httpClient, IConfiguration configuration, ILogger<AuthentikOAuthService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates a user via Authentik's OAuth2 Resource Owner Password flow.
    /// Sends credentials to Authentik's /token/ endpoint and returns the token response.
    /// </summary>
    public async Task<AuthentikTokenResult?> AuthenticateAsync(string username, string password)
    {
        var tokenEndpoint = _configuration["Authentik:TokenEndpoint"]
            ?? "http://localhost:9000/application/o/moviechecker/token/";
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-secret-change-me";

        var requestBody = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "password",
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["username"] = username,
            ["password"] = password,
            ["scope"] = "openid profile email"
        });

        try
        {
            var response = await _httpClient.PostAsync(tokenEndpoint, requestBody);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Authentik token request failed with status {Status}: {Error}",
                    response.StatusCode, errorContent);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<AuthentikRawTokenResponse>(content);

            if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
            {
                _logger.LogWarning("Authentik returned empty or invalid token response");
                return null;
            }

            return new AuthentikTokenResult(
                AccessToken: tokenResponse.AccessToken,
                RefreshToken: tokenResponse.RefreshToken,
                ExpiresIn: tokenResponse.ExpiresIn,
                TokenType: tokenResponse.TokenType ?? "Bearer",
                IdToken: tokenResponse.IdToken
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error communicating with Authentik token endpoint");
            return null;
        }
    }

    /// <summary>
    /// Creates a user in Authentik via the Admin API.
    /// Returns the Authentik user PK on success, null on failure.
    /// </summary>
    public async Task<int?> CreateUserAsync(string username, string displayName, string? email = null)
    {
        var baseUrl = _configuration["Authentik:BaseUrl"] ?? "http://localhost:9000";
        var apiToken = _configuration["Authentik:ApiToken"];

        if (string.IsNullOrEmpty(apiToken))
        {
            _logger.LogError("Authentik API token is not configured");
            return null;
        }

        var payload = JsonSerializer.Serialize(new
        {
            username,
            name = displayName,
            email = email ?? $"{username}@example.com",
            is_active = true
        });

        var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/api/v3/core/users/");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to create user in Authentik: {Status} {Error}",
                    response.StatusCode, error);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var userResult = JsonSerializer.Deserialize<JsonElement>(content);
            return userResult.GetProperty("pk").GetInt32();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user in Authentik");
            return null;
        }
    }

    /// <summary>
    /// Sets the password for a user in Authentik via the Admin API.
    /// </summary>
    public async Task<bool> SetUserPasswordAsync(int authentikUserId, string password)
    {
        var baseUrl = _configuration["Authentik:BaseUrl"] ?? "http://localhost:9000";
        var apiToken = _configuration["Authentik:ApiToken"];

        if (string.IsNullOrEmpty(apiToken))
        {
            _logger.LogError("Authentik API token is not configured");
            return false;
        }

        var payload = JsonSerializer.Serialize(new { password });

        var request = new HttpRequestMessage(HttpMethod.Post,
            $"{baseUrl}/api/v3/core/users/{authentikUserId}/set_password/");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to set password in Authentik: {Status} {Error}",
                    response.StatusCode, error);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting password in Authentik");
            return false;
        }
    }

    /// <summary>
    /// Checks if a username already exists in Authentik.
    /// Returns true if exists, false if not, null if the check failed.
    /// </summary>
    public async Task<bool?> UserExistsAsync(string username)
    {
        var baseUrl = _configuration["Authentik:BaseUrl"] ?? "http://localhost:9000";
        var apiToken = _configuration["Authentik:ApiToken"];

        if (string.IsNullOrEmpty(apiToken))
        {
            _logger.LogError("Authentik API token is not configured");
            return null;
        }

        var request = new HttpRequestMessage(HttpMethod.Get,
            $"{baseUrl}/api/v3/core/users/?username={Uri.EscapeDataString(username)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        try
        {
            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to check user existence in Authentik: {Status}",
                    response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            var pagination = result.GetProperty("pagination");
            return pagination.GetProperty("count").GetInt32() > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking user existence in Authentik");
            return null;
        }
    }

    /// <summary>
    /// Refreshes an access token using a refresh token via Authentik's OAuth2 endpoint.
    /// </summary>
    public async Task<AuthentikTokenResult?> RefreshTokenAsync(string refreshToken)
    {
        var tokenEndpoint = _configuration["Authentik:TokenEndpoint"]
            ?? "http://localhost:9000/application/o/moviechecker/token/";
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-secret-change-me";

        var requestBody = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["refresh_token"] = refreshToken
        });

        try
        {
            var response = await _httpClient.PostAsync(tokenEndpoint, requestBody);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Authentik refresh token request failed with status {Status}: {Error}",
                    response.StatusCode, errorContent);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<AuthentikRawTokenResponse>(content);

            if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
            {
                _logger.LogWarning("Authentik returned empty or invalid refresh token response");
                return null;
            }

            return new AuthentikTokenResult(
                AccessToken: tokenResponse.AccessToken,
                RefreshToken: tokenResponse.RefreshToken,
                ExpiresIn: tokenResponse.ExpiresIn,
                TokenType: tokenResponse.TokenType ?? "Bearer",
                IdToken: tokenResponse.IdToken
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token with Authentik");
            return null;
        }
    }

    /// <summary>
    /// Revokes a token (access or refresh) at Authentik's revocation endpoint.
    /// </summary>
    public async Task<bool> RevokeTokenAsync(string token)
    {
        var tokenEndpoint = _configuration["Authentik:TokenEndpoint"]
            ?? "http://localhost:9000/application/o/moviechecker/token/";
        // Derive revoke endpoint from token endpoint by replacing the last path segment
        var baseUri = new Uri(tokenEndpoint);
        var revokeEndpoint = new Uri(baseUri, "../revoke/").ToString();
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-secret-change-me";

        var requestBody = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["token"] = token,
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret
        });

        try
        {
            var response = await _httpClient.PostAsync(revokeEndpoint, requestBody);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking token at Authentik");
            return false;
        }
    }
}

public record AuthentikTokenResult(
    string AccessToken,
    string? RefreshToken,
    int ExpiresIn,
    string TokenType,
    string? IdToken
);

/// <summary>
/// Raw JSON response from Authentik's /token/ endpoint using snake_case naming.
/// </summary>
internal class AuthentikRawTokenResponse
{
    [System.Text.Json.Serialization.JsonPropertyName("access_token")]
    public string? AccessToken { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("refresh_token")]
    public string? RefreshToken { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("token_type")]
    public string? TokenType { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("id_token")]
    public string? IdToken { get; set; }
}
