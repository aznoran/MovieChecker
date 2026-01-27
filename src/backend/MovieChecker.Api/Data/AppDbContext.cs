using Microsoft.EntityFrameworkCore;
using MovieChecker.Api.Models;

namespace MovieChecker.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Movie> Movies => Set<Movie>();
    public DbSet<WatchEntry> WatchEntries => Set<WatchEntry>();
    public DbSet<PosterImage> PosterImages => Set<PosterImage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Username).IsUnique();
        });

        modelBuilder.Entity<WatchEntry>(entity =>
        {
            entity.HasOne(w => w.Movie)
                .WithMany(m => m.WatchEntries)
                .HasForeignKey(w => w.MovieId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(w => w.User)
                .WithMany(u => u.WatchEntries)
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(w => new { w.MovieId, w.UserId }).IsUnique();
        });
    }
}
