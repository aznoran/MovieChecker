using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MovieChecker.Domain.Models;

namespace MovieChecker.Infrastructure.Data.Configurations;

public class PosterImageConfiguration : IEntityTypeConfiguration<PosterImage>
{
    public void Configure(EntityTypeBuilder<PosterImage> builder)
    {
    }
}
