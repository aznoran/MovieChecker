using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
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

        // HttpClient for Authentik token exchange
        services.AddHttpClient("Authentik");

        // Authentik OIDC JWT Authentication
        var authentikAuthority = configuration["Authentik:Authority"];
        var authentikMetadataUrl = configuration["Authentik:MetadataUrl"];
        var authentikClientId = configuration["Authentik:ClientId"] ?? "moviechecker";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authentikAuthority;
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
                    ValidateIssuerSigningKey = true,
                    ValidAudience = authentikClientId,
                    NameClaimType = "preferred_username",
                };
                
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var authentikId = context.Principal?.FindFirst("sub")?.Value;
                        if (string.IsNullOrEmpty(authentikId))
                        {
                            context.Fail("Missing sub claim in token");
                            return;
                        }
                        
                        var cache = context.HttpContext.RequestServices.GetRequiredService<HybridCache>();
                        var scopeFactory = context.HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
                        var cacheKey = $"authentik_user_{authentikId}";
                        
                        var localUserId = await cache.GetOrCreateAsync(
                            cacheKey,
                            async cancel =>
                            {
                                using var scope = scopeFactory.CreateScope();
                                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                                var user = await dbContext.Users
                                    .FirstOrDefaultAsync(u => u.AuthentikId == authentikId, cancel);
                                return user?.Id ?? 0;
                            },
                            cancellationToken: context.HttpContext.RequestAborted);
                        
                        if (localUserId == 0)
                        {
                            context.Fail("User not provisioned. Call /api/auth/callback first.");
                            return;
                        }

                        // Add local integer user ID as NameIdentifier claim so existing endpoints work unchanged
                        var identity = context.Principal?.Identity as ClaimsIdentity;
                        if (identity != null)
                        {
                            // Remove any existing NameIdentifier claims
                            var existingClaims = identity.FindAll(ClaimTypes.NameIdentifier).ToList();
                            foreach (var claim in existingClaims)
                            {
                                identity.RemoveClaim(claim);
                            }
                            identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, localUserId.ToString()));
                        }
                    }
                };
            });
        services.AddAuthorization();
        services.AddScoped<ILocalizationService, LocalizationService>();

        return services;
    }
}