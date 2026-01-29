using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieChecker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class cards_last_watch_time : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "current_episode",
                table: "watch_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "current_season",
                table: "watch_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "total_episodes",
                table: "watch_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "watching_time",
                table: "watch_entries",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "current_episode",
                table: "watch_entries");

            migrationBuilder.DropColumn(
                name: "current_season",
                table: "watch_entries");

            migrationBuilder.DropColumn(
                name: "total_episodes",
                table: "watch_entries");

            migrationBuilder.DropColumn(
                name: "watching_time",
                table: "watch_entries");
        }
    }
}
