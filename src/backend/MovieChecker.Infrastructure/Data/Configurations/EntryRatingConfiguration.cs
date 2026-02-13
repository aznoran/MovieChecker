using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models.Entities;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class EntryRatingConfiguration : IEntityTypeConfiguration<EntryRating>
{
    public void Configure(EntityTypeBuilder<EntryRating> builder)
    {
        builder.HasIndex(er => new { er.WatchEntryId, er.UserId }).IsUnique();

        // Configure Rating as decimal with precision 3,1 (e.g., 10.0, 5.5)
        builder.Property(er => er.Rating)
            .HasPrecision(3, 1);

        builder.HasOne(er => er.WatchEntry)
            .WithMany(w => w.Ratings)
            .HasForeignKey(er => er.WatchEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(er => er.User)
            .WithMany(u => u.Ratings)
            .HasForeignKey(er => er.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
