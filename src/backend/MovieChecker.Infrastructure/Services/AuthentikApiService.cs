using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MovieChecker.Infrastructure.Services;

public class AuthentikApiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AuthentikApiService> _logger;

    public AuthentikApiService(HttpClient httpClient, IConfiguration configuration, ILogger<AuthentikApiService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        var apiUrl = (configuration["Authentik:ApiUrl"] ?? "http://localhost:9000").TrimEnd('/');
        var apiToken = configuration["Authentik:ApiToken"] ?? "";

        _httpClient.BaseAddress = new Uri(apiUrl + "/");
        _httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiToken);
    }

    public async Task<(bool Success, string? Error)> CreateUserAsync(string username, string email, string displayName, string password)
    {
        try
        {
            var createPayload = new Dictionary<string, object>
            {
                ["username"] = username,
                ["email"] = string.IsNullOrWhiteSpace(email) ? $"{username}@moviechecker.local" : email,
                ["name"] = displayName,
                ["is_active"] = true
            };

            var json = JsonSerializer.Serialize(createPayload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var createResponse = await _httpClient.PostAsync("api/v3/core/users/", content);

            if (!createResponse.IsSuccessStatusCode)
            {
                var errorBody = await createResponse.Content.ReadAsStringAsync();
                _logger.LogWarning("Authentik user creation failed: {StatusCode} {Body}", createResponse.StatusCode, errorBody);

                if (errorBody.Contains("username", StringComparison.OrdinalIgnoreCase) &&
                    (errorBody.Contains("already", StringComparison.OrdinalIgnoreCase) ||
                     errorBody.Contains("unique", StringComparison.OrdinalIgnoreCase)))
                {
                    return (false, "UsernameAlreadyExists");
                }

                return (false, "RegistrationFailed");
            }

            var createdUser = await createResponse.Content.ReadFromJsonAsync<AuthentikUserResponse>();
            if (createdUser == null)
            {
                return (false, "RegistrationFailed");
            }

            // Set password
            var passwordJson = JsonSerializer.Serialize(new Dictionary<string, string> { ["password"] = password });
            var passwordContent = new StringContent(passwordJson, Encoding.UTF8, "application/json");
            var passwordResponse = await _httpClient.PostAsync($"api/v3/core/users/{createdUser.Pk}/set_password/", passwordContent);

            if (!passwordResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("Authentik set password failed for user {Username}: {StatusCode}", username, passwordResponse.StatusCode);
                // Try to clean up the created user
                await _httpClient.DeleteAsync($"api/v3/core/users/{createdUser.Pk}/");
                return (false, "RegistrationFailed");
            }

            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user in Authentik");
            return (false, "RegistrationFailed");
        }
    }

    private class AuthentikUserResponse
    {
        [JsonPropertyName("pk")]
        public int Pk { get; set; }
    }
}
