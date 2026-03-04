using ContentSearch.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ContentSearch.Infrastructure.Data.Configurations;

public class AniListContentConfiguration : IEntityTypeConfiguration<AniListContent>
{
    public void Configure(EntityTypeBuilder<AniListContent> builder)
    {
        builder.ToTable("anilist_content");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.AnilistId).IsUnique();
        builder.HasIndex(e => e.TitleEnglish);

        builder.Property(e => e.Genres).HasColumnType("jsonb");
        builder.Property(e => e.Tags).HasColumnType("jsonb");
    }
}
