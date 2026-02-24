using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Web;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MovieChecker.Infrastructure.Services;

public class AuthentikOAuthService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthentikOAuthService> _logger;

    private const string OobRedirectUri = "urn:ietf:wg:oauth:2.0:oob";

    public AuthentikOAuthService(HttpClient httpClient, IConfiguration configuration, ILogger<AuthentikOAuthService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Full authentication: flow executor → authorization code → token exchange.
    /// Returns Authentik access_token + refresh_token or null on failure.
    /// </summary>
    public async Task<AuthentikTokenResult?> AuthenticateAsync(string username, string password)
    {
        var baseUrl = _configuration["Authentik:BaseUrl"] ?? "http://localhost:9000";
        var flowSlug = _configuration["Authentik:AuthenticationFlowSlug"] ?? "default-authentication-flow";
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-secret-change-me";
        var appSlug = _configuration["Authentik:AppSlug"] ?? "moviechecker";

        _logger.LogInformation("Authenticating user via flow executor + auth code flow");

        var handler = new HttpClientHandler
        {
            CookieContainer = new CookieContainer(),
            UseCookies = true,
            AllowAutoRedirect = false
        };
        using var client = new HttpClient(handler);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            // === Phase 1: Flow executor (identification + password) ===
            var flowUrl = $"{baseUrl}/api/v3/flows/executor/{flowSlug}/";

            // Step 1: GET the flow to get the first challenge
            var response1 = await client.GetAsync(flowUrl);
            if (!response1.IsSuccessStatusCode)
            {
                _logger.LogWarning("Flow executor GET failed: {Status}", response1.StatusCode);
                return null;
            }

            var challenge1 = JsonSerializer.Deserialize<JsonElement>(await response1.Content.ReadAsStringAsync());
            var component1 = challenge1.TryGetProperty("component", out var comp1) ? comp1.GetString() : null;
            _logger.LogInformation("Flow step 1 component: {Component}", component1);

            if (component1 != "ak-stage-identification")
            {
                _logger.LogWarning("Expected ak-stage-identification, got {Component}", component1);
                return null;
            }

            // Step 2: POST username
            var identPayload = new StringContent(
                JsonSerializer.Serialize(new { uid_field = username }),
                Encoding.UTF8, "application/json");
            var response2 = await client.PostAsync(flowUrl, identPayload);
            if (!response2.IsSuccessStatusCode)
            {
                _logger.LogWarning("Flow identification POST failed: {Status}", response2.StatusCode);
                return null;
            }

            var challenge2 = JsonSerializer.Deserialize<JsonElement>(await response2.Content.ReadAsStringAsync());
            var component2 = challenge2.TryGetProperty("component", out var comp2) ? comp2.GetString() : null;

            if (component2 == "xak-flow-redirect")
                return await GetTokensViaAuthCode(client, baseUrl, appSlug, clientId, clientSecret);

            if (component2 != "ak-stage-password")
            {
                if (challenge2.TryGetProperty("response_errors", out var errors2))
                    _logger.LogWarning("Flow identification errors: {Errors}", errors2.ToString());
                else
                    _logger.LogWarning("Expected ak-stage-password, got {Component}", component2);
                return null;
            }

            // Step 3: POST password
            var passPayload = new StringContent(
                JsonSerializer.Serialize(new { password }),
                Encoding.UTF8, "application/json");
            var response3 = await client.PostAsync(flowUrl, passPayload);
            if (!response3.IsSuccessStatusCode)
            {
                _logger.LogWarning("Flow password POST failed: {Status}", response3.StatusCode);
                return null;
            }

            var result = JsonSerializer.Deserialize<JsonElement>(await response3.Content.ReadAsStringAsync());
            var typeResult = result.TryGetProperty("type", out var tr) ? tr.GetString() : null;
            var componentResult = result.TryGetProperty("component", out var cr) ? cr.GetString() : null;

            if (typeResult != "redirect" && componentResult != "xak-flow-redirect")
            {
                if (result.TryGetProperty("response_errors", out var errors3))
                    _logger.LogWarning("Flow authentication errors: {Errors}", errors3.ToString());
                else
                    _logger.LogWarning("Flow did not complete: {Response}", result.ToString());
                return null;
            }

            _logger.LogInformation("Flow authentication succeeded, proceeding to auth code exchange");

            // === Phase 2: Authorization Code flow using the authenticated session ===
            return await GetTokensViaAuthCode(client, baseUrl, appSlug, clientId, clientSecret);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during authentication");
            return null;
        }
    }

    /// <summary>
    /// Uses an authenticated session to get an authorization code and exchange it for tokens.
    /// </summary>
    private async Task<AuthentikTokenResult?> GetTokensViaAuthCode(
        HttpClient sessionClient, string baseUrl, string appSlug, string clientId, string clientSecret)
    {
        try
        {
            // Step 1: Request authorization code
            var authorizeUrl = $"{baseUrl}/application/o/authorize/?" +
                $"response_type=code&client_id={Uri.EscapeDataString(clientId)}" +
                $"&redirect_uri={Uri.EscapeDataString(OobRedirectUri)}" +
                $"&scope={Uri.EscapeDataString("openid profile email")}" +
                $"&state=moviechecker";

            _logger.LogInformation("Requesting authorization code from: {Url}", authorizeUrl);

            var authResponse = await sessionClient.GetAsync(authorizeUrl);

            string? code = null;

            if (authResponse.StatusCode == HttpStatusCode.Redirect ||
                authResponse.StatusCode == HttpStatusCode.Found ||
                authResponse.StatusCode == HttpStatusCode.MovedPermanently)
            {
                var location = authResponse.Headers.Location?.ToString();
                _logger.LogInformation("Authorization redirect to: {Location}", location);

                if (location != null)
                {
                    // Parse code from redirect URL query string
                    // Use dummy base for relative URIs so HttpUtility can parse the query
                    var fullUri = Uri.TryCreate(location, UriKind.Absolute, out var absUri)
                        ? absUri
                        : new Uri(new Uri("http://dummy"), location);
                    var query = HttpUtility.ParseQueryString(fullUri.Query);
                    code = query["code"];
                }
            }
            else if (authResponse.IsSuccessStatusCode)
            {
                // Authentik might return JSON with the code (consent page)
                var content = await authResponse.Content.ReadAsStringAsync();
                _logger.LogInformation("Authorization returned 200, body length: {Length}", content.Length);

                // Check if it's a consent page that auto-submits
                // For implicit consent, try parsing as redirect info
                try
                {
                    var json = JsonSerializer.Deserialize<JsonElement>(content);
                    if (json.TryGetProperty("code", out var codeProp))
                        code = codeProp.GetString();
                }
                catch
                {
                    _logger.LogWarning("Authorization response was not JSON, likely consent page");
                }
            }
            else
            {
                var body = await authResponse.Content.ReadAsStringAsync();
                _logger.LogWarning("Authorization request failed: {Status} {Body}", authResponse.StatusCode, body);
                return null;
            }

            if (string.IsNullOrEmpty(code))
            {
                _logger.LogWarning("Failed to extract authorization code from response");
                return null;
            }

            _logger.LogInformation("Got authorization code, exchanging for tokens");

            // Step 2: Exchange code for tokens
            var tokenEndpoint = $"{baseUrl}/application/o/{appSlug}/token/";
            var tokenRequest = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["redirect_uri"] = OobRedirectUri,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret
            });

            var tokenResponse = await _httpClient.PostAsync(tokenEndpoint, tokenRequest);

            if (!tokenResponse.IsSuccessStatusCode)
            {
                var err = await tokenResponse.Content.ReadAsStringAsync();
                _logger.LogWarning("Token exchange failed: {Status} {Error}", tokenResponse.StatusCode, err);
                return null;
            }

            var tokenContent = await tokenResponse.Content.ReadAsStringAsync();
            var tokens = JsonSerializer.Deserialize<AuthentikRawTokenResponse>(tokenContent);

            if (tokens == null || string.IsNullOrEmpty(tokens.AccessToken))
            {
                _logger.LogWarning("Token exchange returned empty response");
                return null;
            }

            _logger.LogInformation("Successfully obtained Authentik tokens");

            return new AuthentikTokenResult(
                AccessToken: tokens.AccessToken,
                RefreshToken: tokens.RefreshToken,
                ExpiresIn: tokens.ExpiresIn,
                TokenType: tokens.TokenType ?? "Bearer",
                IdToken: tokens.IdToken
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during auth code token exchange");
            return null;
        }
    }

    /// <summary>
    /// Refreshes tokens using Authentik's token endpoint with grant_type=refresh_token.
    /// </summary>
    public async Task<AuthentikTokenResult?> RefreshTokenAsync(string refreshToken)
    {
        var baseUrl = _configuration["Authentik:BaseUrl"] ?? "http://localhost:9000";
        var appSlug = _configuration["Authentik:AppSlug"] ?? "moviechecker";
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-secret-change-me";

        var tokenEndpoint = $"{baseUrl}/application/o/{appSlug}/token/";

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
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Authentik refresh failed: {Status} {Error}", response.StatusCode, err);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var tokens = JsonSerializer.Deserialize<AuthentikRawTokenResponse>(content);

            if (tokens == null || string.IsNullOrEmpty(tokens.AccessToken))
                return null;

            return new AuthentikTokenResult(
                AccessToken: tokens.AccessToken,
                RefreshToken: tokens.RefreshToken,
                ExpiresIn: tokens.ExpiresIn,
                TokenType: tokens.TokenType ?? "Bearer",
                IdToken: tokens.IdToken
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token with Authentik");
            return null;
        }
    }

    /// <summary>
    /// Revokes a token at Authentik's revocation endpoint.
    /// </summary>
    public async Task<bool> RevokeTokenAsync(string token)
    {
        var baseUrl = _configuration["Authentik:BaseUrl"] ?? "http://localhost:9000";
        var appSlug = _configuration["Authentik:AppSlug"] ?? "moviechecker";
        var clientId = _configuration["Authentik:ClientId"] ?? "moviechecker";
        var clientSecret = _configuration["Authentik:ClientSecret"] ?? "moviechecker-secret-change-me";

        var revokeEndpoint = $"{baseUrl}/application/o/{appSlug}/revoke/";

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

    /// <summary>
    /// Creates a user in Authentik via the Admin API.
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
                _logger.LogWarning("Failed to create user in Authentik: {Status} {Error}", response.StatusCode, error);
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
                _logger.LogWarning("Failed to set password in Authentik: {Status} {Error}", response.StatusCode, error);
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
                _logger.LogWarning("Failed to check user existence in Authentik: {Status}", response.StatusCode);
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
    /// Checks if a user is active in Authentik.
    /// </summary>
    public async Task<bool?> IsUserActiveAsync(string username)
    {
        var baseUrl = _configuration["Authentik:BaseUrl"] ?? "http://localhost:9000";
        var apiToken = _configuration["Authentik:ApiToken"];

        if (string.IsNullOrEmpty(apiToken))
        {
            _logger.LogWarning("Authentik API token is not configured, skipping active check");
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
                _logger.LogWarning("Failed to check user active status: {Status}", response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            var results = result.GetProperty("results");

            if (results.GetArrayLength() == 0)
            {
                _logger.LogWarning("User {Username} not found in Authentik", username);
                return false;
            }

            return results[0].GetProperty("is_active").GetBoolean();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking user active status in Authentik");
            return null;
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
/// Raw JSON response from Authentik's /token/ endpoint.
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
