using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class EntryCommentConfiguration : IEntityTypeConfiguration<EntryComment>
{
    public void Configure(EntityTypeBuilder<EntryComment> builder)
    {
        builder.Property(ec => ec.Text)
            .IsRequired()
            .HasMaxLength(1000);

        builder.HasOne(ec => ec.WatchEntry)
            .WithMany(w => w.Comments)
            .HasForeignKey(ec => ec.WatchEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ec => ec.User)
            .WithMany(u => u.Comments)
            .HasForeignKey(ec => ec.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
