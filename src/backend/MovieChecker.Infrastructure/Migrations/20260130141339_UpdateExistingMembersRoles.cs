using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieChecker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateExistingMembersRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Set existing group members who are creators to Owner role (3)
            migrationBuilder.Sql(@"
                UPDATE group_members 
                SET role = 3 
                FROM groups 
                WHERE group_members.group_id = groups.id 
                AND group_members.user_id = groups.created_by_user_id;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
