using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class GroupConfiguration : IEntityTypeConfiguration<Group>
{
    public void Configure(EntityTypeBuilder<Group> builder)
    {
        // Unique index on InviteCode, but only for non-null values
        // Personal groups have null invite codes
        builder.HasIndex(g => g.InviteCode)
            .IsUnique()
            .HasFilter("invite_code IS NOT NULL");

        builder.HasOne(g => g.CreatedBy)
            .WithMany()
            .HasForeignKey(g => g.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
