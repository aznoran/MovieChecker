using ContentSearch.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ContentSearch.Infrastructure.Data.Configurations;

public class TmdbContentConfiguration : IEntityTypeConfiguration<TmdbContent>
{
    public void Configure(EntityTypeBuilder<TmdbContent> builder)
    {
        builder.ToTable("tmdb_content");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => new { e.TmdbId, e.MediaType }).IsUnique();
        builder.HasIndex(e => e.Title);

        builder.Property(e => e.GenreIds).HasColumnType("jsonb");
        builder.Property(e => e.OriginCountry).HasColumnType("jsonb");
    }
}
