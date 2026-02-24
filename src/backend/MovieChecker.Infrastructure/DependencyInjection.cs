using System.Security.Claims;
using System.Text;
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

        // JWT Authentication
        var jwtKey = configuration["Jwt:Key"] ?? "SuperSecretKey12345678901234567890";
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"] ?? "MovieChecker",
                    ValidAudience = configuration["Jwt:Audience"] ?? "MovieChecker",
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                };
                
                // Validate that the user in the JWT actually exists and is active
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                        {
                            context.Fail("Invalid user identifier in token");
                            return;
                        }
                        
                        // Use HybridCache (with Redis backing) to reduce database hits for user validation
                        var cache = context.HttpContext.RequestServices.GetRequiredService<HybridCache>();
                        var scopeFactory = context.HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
                        var cacheKey = $"user_exists_{userId}";
                        
                        var userExists = await cache.GetOrCreateAsync(
                            cacheKey,
                            async cancel =>
                            {
                                using var scope = scopeFactory.CreateScope();
                                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                                return await dbContext.Users.AnyAsync(u => u.Id == userId, cancel);
                            },
                            cancellationToken: context.HttpContext.RequestAborted);
                        
                        if (!userExists)
                        {
                            context.Fail("User no longer exists");
                            return;
                        }

                        // Check if user is still active in Authentik (cached for 30s)
                        var username = context.Principal?.FindFirst(ClaimTypes.Name)?.Value;
                        if (!string.IsNullOrEmpty(username))
                        {
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
                                            "Authentik active check failed for user {Username}, assuming active (fail-open)",
                                            username);
                                    }
                                    // If the check fails (null), assume active to avoid locking everyone out
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
                    }
                };
            });
        services.AddAuthorization();
        services.AddScoped<ILocalizationService, LocalizationService>();

        return services;
    }
}