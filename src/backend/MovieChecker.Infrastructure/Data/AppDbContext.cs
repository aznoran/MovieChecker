using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Entities;

namespace MovieChecker.Infrastructure.Data;

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
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<WatchEntryGroup> WatchEntryGroups => Set<WatchEntryGroup>();
    public DbSet<MemberPermission> MemberPermissions => Set<MemberPermission>();
    public DbSet<InviteLink> InviteLinks => Set<InviteLink>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseSnakeCaseNamingConvention();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
