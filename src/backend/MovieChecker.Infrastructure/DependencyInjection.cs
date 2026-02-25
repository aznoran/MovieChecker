using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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
        .AddScoped<ValidationService>();

        // Redis and HybridCache
        var redisConnection = configuration.GetConnectionString("Redis");
        services.AddSingleton<IConnectionMultiplexer>(sp =>
            ConnectionMultiplexer.Connect(redisConnection!));
        services.AddScoped<OtpService>();

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

        // Authentik OIDC JWT Authentication
        var authentikAuthority = configuration["Authentik:Authority"];
        var authentikMetadataUrl = configuration["Authentik:MetadataUrl"];
        var authentikClientId = configuration["Authentik:ClientId"];
        var authentikIssuer = configuration["Authentik:Issuer"];

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authentikAuthority;
                // HTTPS not required for internal Docker communication (Authentik accessed via internal network)
                options.RequireHttpsMetadata = false;

                if (!string.IsNullOrEmpty(authentikMetadataUrl))
                {
                    options.MetadataAddress = authentikMetadataUrl;
                }

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidAudience = authentikClientId,
                    ValidIssuer = authentikIssuer,
                };

                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var sub = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
                        {
                            context.Fail("Missing or invalid sub claim");
                            return;
                        }

                        // Verify user is provisioned — no creation here, just lookup
                        var cache = context.HttpContext.RequestServices.GetRequiredService<HybridCache>();
                        var scopeFactory = context.HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
                        var exists = await cache.GetOrCreateAsync($"user_exists_{sub}", async cancel =>
                        {
                            using var scope = scopeFactory.CreateScope();
                            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            return await db.Users.AnyAsync(u => u.Id == userId, cancel);
                        });

                        if (!exists)
                        {
                            context.Fail("User not provisioned. Call POST /api/auth/provision first.");
                            return;
                        }

                        // Add Authentik group memberships as ClaimTypes.Role for [Authorize(Roles = ...)]
                        var groups = context.Principal!.FindAll("groups").Select(c => c.Value).ToList();
                        var identity = context.Principal.Identity as ClaimsIdentity;
                        foreach (var group in groups)
                            identity?.AddClaim(new Claim(ClaimTypes.Role, group));
                    }
                };
            });
        services.AddAuthorization();
        services.AddScoped<ILocalizationService, LocalizationService>();

        return services;
    }
}
