using ContentSearch.Core.Endpoints;
using ContentSearch.Infrastructure;
using ContentSearch.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Infrastructure (DB, HttpClients, Caching, Services)
builder.Services.AddSearchInfrastructure(builder.Configuration);

// CORS
var allowedHosts = builder.Configuration.GetSection("AllowedHosts").Get<string[]>()
    ?? ["http://localhost:3000"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedHosts)
            .AllowAnyHeader()
            .AllowAnyMethod();
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

// Wait for database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SearchDbContext>();
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
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "ContentSearch API v1");
    options.RoutePrefix = "swagger";
});

app.UseCors();

// Map endpoints
app.MapSearchEndpoints();

// Health check
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }))
    .WithSummary("Health check");

app.Run();
