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
            ?? "http://localhost:9000/application/o/token/";
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker-client";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-client-secret-change-me";

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
    /// Refreshes an access token using a refresh token via Authentik's OAuth2 endpoint.
    /// </summary>
    public async Task<AuthentikTokenResult?> RefreshTokenAsync(string refreshToken)
    {
        var tokenEndpoint = _configuration["Authentik:TokenEndpoint"]
            ?? "http://localhost:9000/application/o/token/";
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker-client";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-client-secret-change-me";

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
            ?? "http://localhost:9000/application/o/token/";
        // Derive revoke endpoint from token endpoint
        var revokeEndpoint = tokenEndpoint.Replace("/token/", "/revoke/");
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker-client";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-client-secret-change-me";

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
