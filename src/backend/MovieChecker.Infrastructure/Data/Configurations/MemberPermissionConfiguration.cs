using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models.Entities;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class MemberPermissionConfiguration : IEntityTypeConfiguration<MemberPermission>
{
    public void Configure(EntityTypeBuilder<MemberPermission> builder)
    {
        builder.HasOne(mp => mp.GroupMember)
            .WithOne(gm => gm.CustomPermission)
            .HasForeignKey<MemberPermission>(mp => mp.GroupMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(mp => mp.GroupMemberId).IsUnique();
    }
}
