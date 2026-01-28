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
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<EntryRating> EntryRatings => Set<EntryRating>();

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

            entity.HasOne(w => w.Group)
                .WithMany()
                .HasForeignKey(w => w.GroupId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasIndex(g => g.InviteCode).IsUnique();

            entity.HasOne(g => g.CreatedBy)
                .WithMany()
                .HasForeignKey(g => g.CreatedByUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasIndex(gm => new { gm.GroupId, gm.UserId }).IsUnique();

            entity.HasOne(gm => gm.Group)
                .WithMany(g => g.Members)
                .HasForeignKey(gm => gm.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(gm => gm.User)
                .WithMany(u => u.GroupMemberships)
                .HasForeignKey(gm => gm.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EntryRating>(entity =>
        {
            entity.HasIndex(er => new { er.WatchEntryId, er.UserId }).IsUnique();

            entity.HasOne(er => er.WatchEntry)
                .WithMany(w => w.Ratings)
                .HasForeignKey(er => er.WatchEntryId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(er => er.User)
                .WithMany(u => u.Ratings)
                .HasForeignKey(er => er.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
