using System.Net;
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
    /// Authenticates a user via Authentik's headless flow executor API.
    /// This walks through the default-authentication-flow stages (identification → password)
    /// without requiring ROPC/password grant type support.
    /// </summary>
    public async Task<bool> AuthenticateViaFlowAsync(string username, string password)
    {
        var baseUrl = _configuration["Authentik:BaseUrl"] ?? "http://localhost:9000";
        var flowSlug = _configuration["Authentik:AuthenticationFlowSlug"] ?? "default-authentication-flow";

        _logger.LogInformation("Authenticating via flow executor: {BaseUrl}, flow: {Flow}", baseUrl, flowSlug);

        var handler = new HttpClientHandler
        {
            CookieContainer = new CookieContainer(),
            UseCookies = true
        };
        using var client = new HttpClient(handler);
        client.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            var flowUrl = $"{baseUrl}/api/v3/flows/executor/{flowSlug}/";

            // Step 1: GET the flow to get the first challenge (identification stage)
            var response1 = await client.GetAsync(flowUrl);
            if (!response1.IsSuccessStatusCode)
            {
                var err = await response1.Content.ReadAsStringAsync();
                _logger.LogWarning("Flow executor GET failed: {Status} {Error}", response1.StatusCode, err);
                return false;
            }

            var challenge1 = JsonSerializer.Deserialize<JsonElement>(await response1.Content.ReadAsStringAsync());
            var component1 = challenge1.TryGetProperty("component", out var comp1) ? comp1.GetString() : null;
            _logger.LogInformation("Flow step 1 component: {Component}", component1);

            if (component1 != "ak-stage-identification")
            {
                _logger.LogWarning("Expected ak-stage-identification, got {Component}", component1);
                return false;
            }

            // Step 2: POST username (identification)
            var identPayload = new StringContent(
                JsonSerializer.Serialize(new { uid_field = username }),
                Encoding.UTF8, "application/json");
            var response2 = await client.PostAsync(flowUrl, identPayload);
            if (!response2.IsSuccessStatusCode)
            {
                var err = await response2.Content.ReadAsStringAsync();
                _logger.LogWarning("Flow executor POST (identification) failed: {Status} {Error}",
                    response2.StatusCode, err);
                return false;
            }

            var challenge2 = JsonSerializer.Deserialize<JsonElement>(await response2.Content.ReadAsStringAsync());
            var component2 = challenge2.TryGetProperty("component", out var comp2) ? comp2.GetString() : null;
            var type2 = challenge2.TryGetProperty("type", out var t2) ? t2.GetString() : null;
            _logger.LogInformation("Flow step 2 component: {Component}, type: {Type}", component2, type2);

            // Check for redirect (auto-login) or error
            if (type2 == "redirect" || component2 == "xak-flow-redirect")
            {
                // Flow completed after identification (unlikely but handle it)
                return true;
            }

            if (component2 != "ak-stage-password")
            {
                // Check for response_errors (invalid username)
                if (challenge2.TryGetProperty("response_errors", out var errors2))
                {
                    _logger.LogWarning("Flow identification failed: {Errors}", errors2.ToString());
                }
                else
                {
                    _logger.LogWarning("Expected ak-stage-password, got {Component}", component2);
                }
                return false;
            }

            // Step 3: POST password
            var passPayload = new StringContent(
                JsonSerializer.Serialize(new { password }),
                Encoding.UTF8, "application/json");
            var response3 = await client.PostAsync(flowUrl, passPayload);
            if (!response3.IsSuccessStatusCode)
            {
                var err = await response3.Content.ReadAsStringAsync();
                _logger.LogWarning("Flow executor POST (password) failed: {Status} {Error}",
                    response3.StatusCode, err);
                return false;
            }

            var result = JsonSerializer.Deserialize<JsonElement>(await response3.Content.ReadAsStringAsync());
            var typeResult = result.TryGetProperty("type", out var tr) ? tr.GetString() : null;
            var componentResult = result.TryGetProperty("component", out var cr) ? cr.GetString() : null;
            _logger.LogInformation("Flow step 3 type: {Type}, component: {Component}", typeResult, componentResult);

            // Authentik signals success via either type=redirect or component=xak-flow-redirect
            if (typeResult == "redirect" || componentResult == "xak-flow-redirect")
            {
                _logger.LogInformation("Flow authentication succeeded for user");
                return true;
            }

            // Check for errors
            if (result.TryGetProperty("response_errors", out var errors3))
            {
                _logger.LogWarning("Flow authentication failed: {Errors}", errors3.ToString());
            }
            else
            {
                _logger.LogWarning("Flow authentication did not complete. Response: {Response}",
                    result.ToString());
            }
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during flow executor authentication");
            return false;
        }
    }

    /// <summary>
    /// Authenticates a user via Authentik's OAuth2 Resource Owner Password flow (ROPC).
    /// This is a fallback if the flow executor doesn't work.
    /// </summary>
    public async Task<AuthentikTokenResult?> AuthenticateViaRopcAsync(string username, string password)
    {
        var tokenEndpoint = _configuration["Authentik:TokenEndpoint"]
            ?? "http://localhost:9000/application/o/moviechecker/token/";
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-secret-change-me";

        _logger.LogInformation("Trying ROPC at: {Endpoint}", tokenEndpoint);

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
                _logger.LogWarning("ROPC token request failed with {Status}: {Error}",
                    response.StatusCode, errorContent);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<AuthentikRawTokenResponse>(content);

            if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
            {
                _logger.LogWarning("ROPC returned empty token response");
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
            _logger.LogError(ex, "Error communicating with Authentik ROPC endpoint");
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
    /// This is only used if the stored refresh token is an Authentik token (ROPC flow).
    /// For local refresh tokens, use the local refresh logic in AuthEndpoints.
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
                _logger.LogWarning("Authentik refresh failed with {Status}: {Error}",
                    response.StatusCode, errorContent);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<AuthentikRawTokenResponse>(content);

            if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
                return null;

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
