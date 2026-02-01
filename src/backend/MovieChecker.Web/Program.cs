using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
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
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MovieChecker API",
        Version = "v1",
        Description = "API for MovieChecker - A movie tracking and watch list management application",
        Contact = new OpenApiContact
        {
            Name = "MovieChecker",
            Url = new Uri("https://github.com/aznoran/MovieChecker")
        }
    });

    // Add JWT Authentication support
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme."
    });

    // Make all endpoints require authorization by default
    options.AddSecurityRequirement((doc) =>
    {
        var scheme = new OpenApiSecuritySchemeReference("Bearer", doc, null);
        return new OpenApiSecurityRequirement
        {
            { scheme, new List<string>() }
        };
    });
});

var app = builder.Build();

// Create/migrate database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var retries = 10;
    while (retries > 0)
    {
        try
        {
            db.Database.Migrate();
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

// Swagger UI (enabled in development and can be enabled in production via config)
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("EnableSwagger"))
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "MovieChecker API v1");
        options.RoutePrefix = "swagger";
    });
}

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
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }))
    .WithTags("Health")
    .WithDescription("Health check endpoint");

// Test localization endpoint
app.MapTestLocalizationEndpoints();

app.Run();
