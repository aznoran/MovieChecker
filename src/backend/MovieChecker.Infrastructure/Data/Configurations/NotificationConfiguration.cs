using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(n => n.Id);
        
        builder.Property(n => n.Title)
            .IsRequired()
            .HasMaxLength(200);
        
        builder.Property(n => n.Message)
            .IsRequired()
            .HasMaxLength(500);
        
        builder.Property(n => n.Type)
            .IsRequired();
        
        builder.Property(n => n.IsRead)
            .IsRequired()
            .HasDefaultValue(false);
        
        builder.Property(n => n.CreatedAt)
            .IsRequired();
        
        builder.HasOne(n => n.User)
            .WithMany(u => u.Notifications)
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasIndex(n => new { n.UserId, n.CreatedAt });
    }
}
