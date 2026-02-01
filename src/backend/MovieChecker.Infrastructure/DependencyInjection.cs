using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
        .AddScoped<JwtService>()
        .AddScoped<ValidationService>();

        // Add memory cache for user validation
        services.AddMemoryCache();

        // Redis
        var redisConnection = configuration.GetConnectionString("Redis");
        services.AddSingleton<IConnectionMultiplexer>(sp =>
            ConnectionMultiplexer.Connect(redisConnection!));
        services.AddScoped<OtpService>();

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
                
                // Validate that the user in the JWT actually exists in the database
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
                        
                        // Use cache to reduce database hits for user validation
                        var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
                        var cacheKey = $"user_exists_{userId}";
                        
                        if (!cache.TryGetValue(cacheKey, out bool userExists))
                        {
                            // Create a scope to properly manage DbContext lifetime
                            var scopeFactory = context.HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
                            using var scope = scopeFactory.CreateScope();
                            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            userExists = await dbContext.Users.AnyAsync(u => u.Id == userId);
                            
                            // Cache the result for 5 minutes
                            cache.Set(cacheKey, userExists, TimeSpan.FromMinutes(5));
                        }
                        
                        if (!userExists)
                        {
                            context.Fail("User no longer exists");
                        }
                    }
                };
            });
        services.AddAuthorization();
        services.AddScoped<ILocalizationService, LocalizationService>();

        return services;
    }
}