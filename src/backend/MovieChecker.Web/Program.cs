using Microsoft.EntityFrameworkCore;
using MovieChecker.Infrastructure;
using MovieChecker.Infrastructure.Data;
using MovieChecker.Web.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddInfrastructure(builder.Configuration);

// Localization
builder.Services.AddLocalization(options => options.ResourcesPath = "Resources");
builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    var supportedCultures = new[] { "en", "ru" };
    options.SetDefaultCulture("en")
        .AddSupportedCultures(supportedCultures)
        .AddSupportedUICultures(supportedCultures);
});

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:3000"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

var app = builder.Build();

// Wait for database to be ready (migrations are handled by Flyway)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var retries = 10;
    while (retries > 0)
    {
        try
        {
            db.Database.CanConnect();
            break;
        }
        catch
        {
            retries--;
            if (retries == 0) throw;
            Thread.Sleep(3000);
        }
    }
}

// Swagger
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "MovieChecker API v1");
    options.RoutePrefix = "swagger";
});

app.UseCors();
app.UseRequestLocalization();
app.UseAuthentication();
app.UseAuthorization();

// Map endpoints
app.MapAuthEndpoints();
app.MapMovieEndpoints();
app.MapWatchEntryEndpoints();
app.MapUploadEndpoints();
app.MapGroupEndpoints();
app.MapUserSettingsEndpoints();

// Health check
app.MapGet("/api/health", () => Results.Ok(new MovieChecker.Domain.Models.Dtos.HealthResponse("healthy")))
    .Produces<MovieChecker.Domain.Models.Dtos.HealthResponse>(StatusCodes.Status200OK)
    .WithSummary("Health check")
    .WithDescription("Returns the health status of the API");

// Test localization endpoint
app.MapTestLocalizationEndpoints();

app.Run();
