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
        });

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
        var authentikAuthority = configuration["Authentik:Authority"]
            ?? "https://auth.xui123qweqwe.org/application/o/moviechecker/";
        var authentikClientId = configuration["Authentik:ClientId"] ?? "moviechecker";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authentikAuthority;
                options.Audience = authentikClientId;
                options.RequireHttpsMetadata = false;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    NameClaimType = "preferred_username",
                    RoleClaimType = ClaimTypes.Role
                };
                
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var sub = context.Principal?.FindFirst("sub")?.Value;
                        if (string.IsNullOrEmpty(sub))
                        {
                            context.Fail("Missing sub claim in token");
                            return;
                        }

                        var cache = context.HttpContext.RequestServices.GetRequiredService<HybridCache>();
                        var scopeFactory = context.HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
                        var cacheKey = $"authentik_user_{sub}";
                        
                        // Look up or auto-provision user from Authentik claims
                        var localUserId = await cache.GetOrCreateAsync(
                            cacheKey,
                            async cancel =>
                            {
                                using var scope = scopeFactory.CreateScope();
                                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                                
                                var user = await dbContext.Users.FirstOrDefaultAsync(
                                    u => u.AuthentikId == sub, cancel);
                                
                                if (user != null) return user.Id;

                                // Auto-provision new user from Authentik claims
                                var username = context.Principal?.FindFirst("preferred_username")?.Value ?? sub;
                                var displayName = context.Principal?.FindFirst("name")?.Value
                                    ?? context.Principal?.FindFirst("given_name")?.Value
                                    ?? username;

                                user = new User
                                {
                                    AuthentikId = sub,
                                    Username = username,
                                    PasswordHash = null,
                                    DisplayName = displayName
                                };
                                dbContext.Users.Add(user);
                                await dbContext.SaveChangesAsync(cancel);

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
                                dbContext.Groups.Add(personalGroup);
                                await dbContext.SaveChangesAsync(cancel);

                                dbContext.GroupMembers.Add(new GroupMember
                                {
                                    GroupId = personalGroup.Id,
                                    UserId = user.Id,
                                    Role = GroupRole.Owner
                                });
                                await dbContext.SaveChangesAsync(cancel);

                                return user.Id;
                            },
                            cancellationToken: context.HttpContext.RequestAborted);
                        
                        if (localUserId == 0)
                        {
                            context.Fail("Failed to provision user");
                            return;
                        }

                        // Add local user ID as NameIdentifier so existing endpoints work unchanged
                        var identity = context.Principal?.Identity as ClaimsIdentity;
                        if (identity != null)
                        {
                            // Remove any existing NameIdentifier claims
                            var existing = identity.FindAll(ClaimTypes.NameIdentifier).ToList();
                            foreach (var claim in existing)
                                identity.TryRemoveClaim(claim);
                            
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