using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models.Entities;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class WatchEntryGroupConfiguration : IEntityTypeConfiguration<WatchEntryGroup>
{
    public void Configure(EntityTypeBuilder<WatchEntryGroup> builder)
    {
        builder.HasIndex(weg => new { weg.WatchEntryId, weg.GroupId }).IsUnique();

        builder.HasOne(weg => weg.WatchEntry)
            .WithMany(w => w.WatchEntryGroups)
            .HasForeignKey(weg => weg.WatchEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(weg => weg.Group)
            .WithMany(g => g.WatchEntryGroups)
            .HasForeignKey(weg => weg.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
