using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieChecker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserRolesAndGroupPasswords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_private",
                table: "groups",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "password_hash",
                table: "groups",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "role",
                table: "group_members",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_private",
                table: "groups");

            migrationBuilder.DropColumn(
                name: "password_hash",
                table: "groups");

            migrationBuilder.DropColumn(
                name: "role",
                table: "group_members");
        }
    }
}
