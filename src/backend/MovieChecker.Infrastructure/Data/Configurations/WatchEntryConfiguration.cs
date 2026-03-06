using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models.Entities;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class WatchEntryConfiguration : IEntityTypeConfiguration<WatchEntry>
{
    public void Configure(EntityTypeBuilder<WatchEntry> builder)
    {
        builder.HasQueryFilter(w => !w.IsArchived);

        builder.HasOne(w => w.Movie)
            .WithMany(m => m.WatchEntries)
            .HasForeignKey(w => w.MovieId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.User)
            .WithMany(u => u.WatchEntries)
            .HasForeignKey(w => w.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.Group)
            .WithMany()
            .HasForeignKey(w => w.GroupId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
