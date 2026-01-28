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
var isPostgres = !string.IsNullOrEmpty(connectionString);
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (isPostgres)
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
    if (isPostgres)
    {
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

        // Ensure new tables/columns exist on already-created databases
        var pgMigrations = """
            CREATE TABLE IF NOT EXISTS "PosterImages" (
                "Id" SERIAL PRIMARY KEY,
                "FileName" TEXT NOT NULL DEFAULT '',
                "ContentType" TEXT NOT NULL DEFAULT '',
                "Data" BYTEA NOT NULL DEFAULT '\x',
                "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS "Groups" (
                "Id" SERIAL PRIMARY KEY,
                "Name" TEXT NOT NULL DEFAULT '',
                "InviteCode" TEXT NOT NULL DEFAULT '',
                "CreatedByUserId" INTEGER NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
                "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Groups_InviteCode" ON "Groups" ("InviteCode");
            CREATE TABLE IF NOT EXISTS "GroupMembers" (
                "Id" SERIAL PRIMARY KEY,
                "GroupId" INTEGER NOT NULL REFERENCES "Groups"("Id") ON DELETE CASCADE,
                "UserId" INTEGER NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
                "JoinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_GroupMembers_GroupId_UserId" ON "GroupMembers" ("GroupId", "UserId");
            ALTER TABLE "WatchEntries" ADD COLUMN IF NOT EXISTS "GroupId" INTEGER REFERENCES "Groups"("Id") ON DELETE SET NULL;
            CREATE TABLE IF NOT EXISTS "EntryRatings" (
                "Id" SERIAL PRIMARY KEY,
                "WatchEntryId" INTEGER NOT NULL REFERENCES "WatchEntries"("Id") ON DELETE CASCADE,
                "UserId" INTEGER NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
                "Rating" INTEGER NOT NULL DEFAULT 0,
                "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_EntryRatings_WatchEntryId_UserId" ON "EntryRatings" ("WatchEntryId", "UserId");
            """;
        db.Database.ExecuteSqlRaw(pgMigrations);
    }
    else
    {
        db.Database.EnsureCreated();

        var sqliteMigrations = new[]
        {
            """CREATE TABLE IF NOT EXISTS "PosterImages" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "FileName" TEXT NOT NULL DEFAULT '', "ContentType" TEXT NOT NULL DEFAULT '', "Data" BLOB NOT NULL DEFAULT X'', "CreatedAt" TEXT NOT NULL DEFAULT '0001-01-01T00:00:00')""",
            """CREATE TABLE IF NOT EXISTS "Groups" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL DEFAULT '', "InviteCode" TEXT NOT NULL DEFAULT '', "CreatedByUserId" INTEGER NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE, "CreatedAt" TEXT NOT NULL DEFAULT '0001-01-01T00:00:00')""",
            """CREATE UNIQUE INDEX IF NOT EXISTS "IX_Groups_InviteCode" ON "Groups" ("InviteCode")""",
            """CREATE TABLE IF NOT EXISTS "GroupMembers" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "GroupId" INTEGER NOT NULL REFERENCES "Groups"("Id") ON DELETE CASCADE, "UserId" INTEGER NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE, "JoinedAt" TEXT NOT NULL DEFAULT '0001-01-01T00:00:00')""",
            """CREATE UNIQUE INDEX IF NOT EXISTS "IX_GroupMembers_GroupId_UserId" ON "GroupMembers" ("GroupId", "UserId")""",
            """CREATE TABLE IF NOT EXISTS "EntryRatings" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "WatchEntryId" INTEGER NOT NULL REFERENCES "WatchEntries"("Id") ON DELETE CASCADE, "UserId" INTEGER NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE, "Rating" INTEGER NOT NULL DEFAULT 0, "CreatedAt" TEXT NOT NULL DEFAULT '0001-01-01T00:00:00')""",
            """CREATE UNIQUE INDEX IF NOT EXISTS "IX_EntryRatings_WatchEntryId_UserId" ON "EntryRatings" ("WatchEntryId", "UserId")""",
        };

        foreach (var sql in sqliteMigrations)
            db.Database.ExecuteSqlRaw(sql);

        // SQLite doesn't support ADD COLUMN IF NOT EXISTS, so try/catch
        try { db.Database.ExecuteSqlRaw("""ALTER TABLE "WatchEntries" ADD COLUMN "GroupId" INTEGER REFERENCES "Groups"("Id")"""); } catch { /* column already exists */ }
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
app.MapGroupEndpoints();

// Health check
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
