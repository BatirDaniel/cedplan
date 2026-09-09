using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CedPlan.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultCalendarView",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "DefaultEventDurationMinutes",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultCalendarView",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DefaultEventDurationMinutes",
                table: "AspNetUsers");
        }
    }
}
