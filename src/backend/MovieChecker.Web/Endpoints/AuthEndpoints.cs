using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/callback", OidcCallback)
            .Produces<AuthResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .WithSummary("OIDC callback")
            .WithDescription(
                "Exchanges an Authentik authorization code for tokens, provisions the user and personal group if new, and returns the access token with user info");

        group.MapPost("/language", SetLanguage)
            .Produces<LanguageResponse>(StatusCodes.Status200OK)
            .WithSummary("Set preferred language")
            .WithDescription("Sets the user's preferred language (en or ru)");
    }

    private static async Task<IResult> OidcCallback(
        OidcCallbackRequest request,
        AppDbContext db,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        var tokenEndpoint = configuration["Authentik:TokenEndpoint"];
        var clientId = configuration["Authentik:ClientId"] ?? "moviechecker";
        var clientSecret = configuration["Authentik:ClientSecret"];

        if (string.IsNullOrEmpty(tokenEndpoint))
        {
            return Results.BadRequest(new ErrorResponse("Authentik is not configured"));
        }

        // Exchange authorization code for tokens
        var httpClient = httpClientFactory.CreateClient("Authentik");
        var tokenRequest = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = request.Code,
            ["redirect_uri"] = request.RedirectUri,
            ["client_id"] = clientId,
        };

        if (!string.IsNullOrEmpty(clientSecret))
        {
            tokenRequest["client_secret"] = clientSecret;
        }

        if (!string.IsNullOrEmpty(request.CodeVerifier))
        {
            tokenRequest["code_verifier"] = request.CodeVerifier;
        }

        var tokenResponse = await httpClient.PostAsync(
            tokenEndpoint,
            new FormUrlEncodedContent(tokenRequest));

        if (!tokenResponse.IsSuccessStatusCode)
        {
            var errorBody = await tokenResponse.Content.ReadAsStringAsync();
            return Results.BadRequest(new ErrorResponse($"Token exchange failed: {errorBody}"));
        }

        var tokenJson = await tokenResponse.Content.ReadAsStringAsync();
        var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenJson);

        var accessToken = tokenData.GetProperty("access_token").GetString();

        if (string.IsNullOrEmpty(accessToken))
        {
            return Results.BadRequest(new ErrorResponse("No access token in response"));
        }

        // Fetch user info from Authentik
        var userInfoEndpoint = configuration["Authentik:UserInfoEndpoint"];
        if (string.IsNullOrEmpty(userInfoEndpoint))
        {
            return Results.BadRequest(new ErrorResponse("UserInfo endpoint not configured"));
        }

        var userInfoRequest = new HttpRequestMessage(HttpMethod.Get, userInfoEndpoint);
        userInfoRequest.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var userInfoResponse = await httpClient.SendAsync(userInfoRequest);
        if (!userInfoResponse.IsSuccessStatusCode)
        {
            return Results.BadRequest(new ErrorResponse("Failed to fetch user info from Authentik"));
        }

        var userInfoJson = await userInfoResponse.Content.ReadAsStringAsync();
        var userInfo = JsonSerializer.Deserialize<JsonElement>(userInfoJson);

        if (!userInfo.TryGetProperty("sub", out var subProp))
        {
            return Results.BadRequest(new ErrorResponse("Missing sub claim in user info"));
        }
        var authentikId = subProp.GetString();
        var username = userInfo.TryGetProperty("preferred_username", out var usernameProp)
            ? usernameProp.GetString()
            : authentikId;
        var displayName = userInfo.TryGetProperty("name", out var nameProp)
            ? nameProp.GetString()
            : username;

        if (string.IsNullOrEmpty(authentikId))
        {
            return Results.BadRequest(new ErrorResponse("Invalid sub claim in user info"));
        }

        // Find or create local user
        var user = await db.Users.FirstOrDefaultAsync(u => u.AuthentikId == authentikId);

        if (user == null)
        {
            // Provision new user
            user = new User
            {
                Username = username ?? authentikId,
                PasswordHash = null,
                DisplayName = displayName ?? username ?? authentikId,
                AuthentikId = authentikId
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            // Create personal group for the new user
            var personalGroup = new Group
            {
                Name = "Personal",
                InviteCode = null,
                CreatedByUserId = user.Id,
                IsPrivate = false,
                GroupType = GroupType.Personal,
                DefaultRole = GroupRole.Owner
            };
            db.Groups.Add(personalGroup);
            await db.SaveChangesAsync();

            db.GroupMembers.Add(new GroupMember
            {
                GroupId = personalGroup.Id,
                UserId = user.Id,
                Role = GroupRole.Owner
            });
            await db.SaveChangesAsync();
        }
        else
        {
            // Update display name if changed in Authentik
            var newDisplayName = displayName ?? username ?? authentikId;
            if (user.DisplayName != newDisplayName)
            {
                user.DisplayName = newDisplayName;
                await db.SaveChangesAsync();
            }
        }

        return Results.Ok(new AuthResponse(
            accessToken,
            new UserDto(user.Id, user.Username, user.DisplayName)
        ));
    }

    private static IResult SetLanguage(HttpContext context, SetLanguageRequest request)
    {
        var culture = request.Language switch
        {
            "ru" => "ru",
            _ => "en"
        };

        context.Response.Cookies.Append(
            Microsoft.AspNetCore.Localization.CookieRequestCultureProvider.DefaultCookieName,
            Microsoft.AspNetCore.Localization.CookieRequestCultureProvider.MakeCookieValue(
                new Microsoft.AspNetCore.Localization.RequestCulture(culture)),
            new CookieOptions
            {
                Expires = DateTimeOffset.UtcNow.AddYears(1),
                IsEssential = true,
                HttpOnly = false,
                SameSite = SameSiteMode.Lax
            }
        );

        return Results.Ok(new LanguageResponse(culture));
    }
}

public record SetLanguageRequest(string Language);
public record OidcCallbackRequest(string Code, string RedirectUri, string? CodeVerifier);
