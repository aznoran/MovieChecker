using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MovieChecker.Api.Data;
using MovieChecker.Api.Endpoints;
using MovieChecker.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(connectionString))
        options.UseNpgsql(connectionString);
    else
        options.UseSqlite("Data Source=moviechecker.db");
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SuperSecretKey12345678901234567890";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "MovieChecker",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "MovieChecker",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();

// Services
builder.Services.AddScoped<JwtService>();

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

var app = builder.Build();

// Create/migrate database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (!string.IsNullOrEmpty(connectionString))
    {
        // Wait for PostgreSQL to be ready
        var retries = 10;
        while (retries > 0)
        {
            try
            {
                db.Database.EnsureCreated();
                break;
            }
            catch
            {
                retries--;
                if (retries == 0) throw;
                Thread.Sleep(3000);
            }
        }

        // Ensure new tables exist (EnsureCreated won't add tables to existing DB)
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "PosterImages" (
                "Id" SERIAL PRIMARY KEY,
                "FileName" TEXT NOT NULL DEFAULT '',
                "ContentType" TEXT NOT NULL DEFAULT '',
                "Data" BYTEA NOT NULL DEFAULT '\x',
                "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            )
            """);
    }
    else
    {
        db.Database.EnsureCreated();
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "PosterImages" (
                "Id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "FileName" TEXT NOT NULL DEFAULT '',
                "ContentType" TEXT NOT NULL DEFAULT '',
                "Data" BLOB NOT NULL DEFAULT X'',
                "CreatedAt" TEXT NOT NULL DEFAULT '0001-01-01T00:00:00'
            )
            """);
    }
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Map endpoints
app.MapAuthEndpoints();
app.MapMovieEndpoints();
app.MapWatchEntryEndpoints();
app.MapUploadEndpoints();

// Health check
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
