using ContentSearch.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ContentSearch.Infrastructure.Data;

public class SearchDbContext : DbContext
{
    public SearchDbContext(DbContextOptions<SearchDbContext> options) : base(options) { }

    public DbSet<ExternalContent> ExternalContents => Set<ExternalContent>();
    public DbSet<TmdbContent> TmdbContents => Set<TmdbContent>();
    public DbSet<AniListContent> AniListContents => Set<AniListContent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("content_search");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SearchDbContext).Assembly);
    }
}
