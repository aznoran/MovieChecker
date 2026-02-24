using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using MovieChecker.Infrastructure.Abstractions;
using MovieChecker.Infrastructure.Data;
using MovieChecker.Infrastructure.Services;
using StackExchange.Redis;

namespace MovieChecker.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
        {
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));
        })
        .AddScoped<JwtService>()
        .AddScoped<ValidationService>();

        // Redis and HybridCache
        var redisConnection = configuration.GetConnectionString("Redis");
        services.AddSingleton<IConnectionMultiplexer>(sp =>
            ConnectionMultiplexer.Connect(redisConnection!));
        services.AddScoped<OtpService>();
        services.AddScoped<TokenService>();
        services.AddHttpClient<AuthentikOAuthService>();
        
        // Configure HybridCache with Redis as the distributed cache backing store
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnection;
            options.InstanceName = "MovieChecker:";
        });
        services.AddHybridCache(options =>
        {
            options.DefaultEntryOptions = new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(1),
                LocalCacheExpiration = TimeSpan.FromMinutes(1)
            };
        });

        // JWT Authentication — validate Authentik-issued tokens
        var authentikBaseUrl = configuration["Authentik:BaseUrl"] ?? "http://localhost:9000";
        var authentikAppSlug = configuration["Authentik:AppSlug"] ?? "moviechecker";
        var authentikIssuer = configuration["Authentik:Issuer"]
            ?? $"{authentikBaseUrl}/application/o/{authentikAppSlug}/";
        var authentikClientId = configuration["Authentik:ClientId"] ?? "moviechecker";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Use Authentik's OIDC discovery endpoint for JWKS validation
                options.Authority = authentikIssuer;
                options.RequireHttpsMetadata = false; // Allow HTTP for local development

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = authentikIssuer,
                    ValidateAudience = true,
                    ValidAudience = authentikClientId,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    // Map Authentik's preferred_username to Name for Identity.Name
                    NameClaimType = "preferred_username",
                };
                
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        // Extract username from Authentik token claims
                        var username = context.Principal?.FindFirst("preferred_username")?.Value
                            ?? context.Principal?.FindFirst("sub")?.Value;

                        if (string.IsNullOrEmpty(username))
                        {
                            context.Fail("Token missing preferred_username claim");
                            return;
                        }
                        
                        // Use HybridCache to reduce database hits for user lookup
                        var cache = context.HttpContext.RequestServices.GetRequiredService<HybridCache>();
                        var scopeFactory = context.HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();

                        // Look up local user by username (cached)
                        var userCacheKey = $"user_by_name_{username}";
                        var userInfo = await cache.GetOrCreateAsync(
                            userCacheKey,
                            async cancel =>
                            {
                                using var scope = scopeFactory.CreateScope();
                                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                                var user = await dbContext.Users.FirstOrDefaultAsync(
                                    u => u.Username == username, cancel);
                                if (user == null) return null;
                                return new CachedUserInfo(user.Id, user.Username, user.DisplayName);
                            },
                            new HybridCacheEntryOptions
                            {
                                Expiration = TimeSpan.FromMinutes(2),
                                LocalCacheExpiration = TimeSpan.FromMinutes(2)
                            },
                            cancellationToken: context.HttpContext.RequestAborted);
                        
                        if (userInfo == null)
                        {
                            context.Fail("User not provisioned locally");
                            return;
                        }

                        // Add local user claims so existing endpoints continue to work
                        var identity = context.Principal?.Identity as ClaimsIdentity;
                        identity?.AddClaim(new Claim(ClaimTypes.NameIdentifier, userInfo.Id.ToString()));
                        identity?.AddClaim(new Claim(ClaimTypes.Name, userInfo.Username));
                        identity?.AddClaim(new Claim("displayName", userInfo.DisplayName));

                        // Check if user is still active in Authentik (cached for 30s)
                        var activeCacheKey = $"user_active_{username}";
                        var isActive = await cache.GetOrCreateAsync(
                            activeCacheKey,
                            async cancel =>
                            {
                                using var scope = scopeFactory.CreateScope();
                                var authentikService = scope.ServiceProvider.GetRequiredService<AuthentikOAuthService>();
                                var result = await authentikService.IsUserActiveAsync(username);
                                if (result == null)
                                {
                                    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
                                        .CreateLogger("AuthValidation");
                                    logger.LogWarning(
                                        "Authentik active check failed for {Username}, assuming active (fail-open)",
                                        username);
                                }
                                return result ?? true;
                            },
                            new HybridCacheEntryOptions
                            {
                                Expiration = TimeSpan.FromSeconds(30),
                                LocalCacheExpiration = TimeSpan.FromSeconds(30)
                            },
                            cancellationToken: context.HttpContext.RequestAborted);

                        if (!isActive)
                        {
                            context.Fail("User account is deactivated");
                        }
                    }
                };
            });
        services.AddAuthorization();
        services.AddScoped<ILocalizationService, LocalizationService>();

        return services;
    }
    
    private record CachedUserInfo(int Id, string Username, string DisplayName);
}
