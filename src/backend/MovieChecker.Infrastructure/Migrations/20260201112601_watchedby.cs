using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieChecker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class watchedby : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "watched_by",
                table: "watch_entries");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "watched_by",
                table: "watch_entries",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
