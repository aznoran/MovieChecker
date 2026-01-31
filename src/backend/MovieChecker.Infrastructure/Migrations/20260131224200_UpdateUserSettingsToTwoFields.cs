using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieChecker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateUserSettingsToTwoFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "prevent_auto_add_to_personal",
                table: "user_settings",
                newName: "prevent_others_adding_to_my_personal");

            migrationBuilder.AddColumn<bool>(
                name: "prevent_me_adding_to_my_personal",
                table: "user_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "prevent_me_adding_to_my_personal",
                table: "user_settings");

            migrationBuilder.RenameColumn(
                name: "prevent_others_adding_to_my_personal",
                table: "user_settings",
                newName: "prevent_auto_add_to_personal");
        }
    }
}
