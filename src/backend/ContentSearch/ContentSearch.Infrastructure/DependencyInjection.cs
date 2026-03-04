using ContentSearch.Infrastructure.Data;
using ContentSearch.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;


namespace ContentSearch.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddSearchInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // Database
        services.AddDbContext<SearchDbContext>(options =>
            options.UseNpgsql(config.GetConnectionString("DefaultConnection"))
                .UseSnakeCaseNamingConvention());

        // HttpClients
        var tmdbBaseUrl = config["ExternalApis:Tmdb:BaseUrl"] ?? "https://api.themoviedb.org/3/";
        if (!tmdbBaseUrl.EndsWith('/')) tmdbBaseUrl += "/";
        var tmdbAccessToken = config["ExternalApis:Tmdb:AccessToken"] ?? "";
        services.AddHttpClient("Tmdb", client =>
        {
            client.BaseAddress = new Uri(tmdbBaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            if (!string.IsNullOrEmpty(tmdbAccessToken))
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {tmdbAccessToken}");
        });

        var aniListBaseUrl = config["ExternalApis:AniList:BaseUrl"] ?? "https://graphql.anilist.co";
        services.AddHttpClient("AniList", client =>
        {
            client.BaseAddress = new Uri(aniListBaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });

        var translationBaseUrl = config["ExternalApis:Translation:BaseUrl"] ?? "https://api-free.deepl.com";
        var deeplApiKey = config["ExternalApis:Translation:ApiKey"] ?? "";
        services.AddHttpClient("Translation", client =>
        {
            client.BaseAddress = new Uri(translationBaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            if (!string.IsNullOrEmpty(deeplApiKey))
                client.DefaultRequestHeaders.Add("Authorization", $"DeepL-Auth-Key {deeplApiKey}");
        });

        // Services
        services.AddScoped<TmdbService>();
        services.AddScoped<AniListService>();
        services.AddSingleton<TranslationService>();

        // Caching
        var redisConnection = config.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnection))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnection;
                options.InstanceName = "ContentSearch:";
            });
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

#pragma warning disable EXTEXP0018
        services.AddHybridCache();
#pragma warning restore EXTEXP0018

        return services;
    }
}
