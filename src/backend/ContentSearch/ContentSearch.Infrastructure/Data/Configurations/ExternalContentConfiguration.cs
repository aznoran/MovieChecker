using ContentSearch.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ContentSearch.Infrastructure.Data.Configurations;

public class ExternalContentConfiguration : IEntityTypeConfiguration<ExternalContent>
{
    public void Configure(EntityTypeBuilder<ExternalContent> builder)
    {
        builder.ToTable("external_content");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => new { e.Provider, e.ExternalId }).IsUnique();
        builder.HasIndex(e => e.Title);
    }
}
