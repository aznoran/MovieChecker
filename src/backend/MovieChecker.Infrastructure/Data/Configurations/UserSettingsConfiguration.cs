using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models.Entities;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> builder)
    {
        builder.HasKey(us => us.Id);
        
        builder.HasIndex(us => us.UserId).IsUnique();
        
        builder.Property(us => us.PreventOthersAddingToMyPersonal)
            .IsRequired();
        
        builder.Property(us => us.PreventMeAddingToMyPersonal)
            .IsRequired();
        
        builder.Property(us => us.CreatedAt)
            .IsRequired();
        
        builder.Property(us => us.UpdatedAt)
            .IsRequired();
        
        builder.HasOne(us => us.User)
            .WithOne(u => u.Settings)
            .HasForeignKey<UserSettings>(us => us.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
