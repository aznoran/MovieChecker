using ContentSearch.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ContentSearch.Infrastructure.Data.Configurations;

public class SearchQueryLogConfiguration : IEntityTypeConfiguration<SearchQueryLog>
{
    public void Configure(EntityTypeBuilder<SearchQueryLog> builder)
    {
        builder.ToTable("search_query_log");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Query).IsRequired();
        builder.Property(e => e.RequestType).HasMaxLength(20).IsRequired();
        builder.Property(e => e.TargetLanguage).HasMaxLength(10);
        builder.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

        builder.HasIndex(e => e.CreatedAt);
    }
}
