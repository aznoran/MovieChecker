using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models.Entities;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class InviteLinkConfiguration : IEntityTypeConfiguration<InviteLink>
{
    public void Configure(EntityTypeBuilder<InviteLink> builder)
    {
        builder.HasIndex(il => il.Token).IsUnique();

        builder.HasOne(il => il.Group)
            .WithMany()
            .HasForeignKey(il => il.GroupId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(il => il.CreatedBy)
            .WithMany()
            .HasForeignKey(il => il.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
