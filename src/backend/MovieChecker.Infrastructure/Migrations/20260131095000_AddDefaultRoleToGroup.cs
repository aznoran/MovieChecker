using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieChecker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDefaultRoleToGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "default_role",
                table: "groups",
                type: "integer",
                nullable: false,
                defaultValue: 1); // Default to Member (1)

            // Set existing public groups to Viewer (0)
            migrationBuilder.Sql(@"
                UPDATE groups 
                SET default_role = 0 
                WHERE is_private = false;
            ");

            // Set existing private groups to Member (1) - already default
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "default_role",
                table: "groups");
        }
    }
}
