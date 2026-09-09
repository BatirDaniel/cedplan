using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CedPlan.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkPackageSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Sequence",
                table: "WorkPackages",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Sequence",
                table: "WorkPackages");
        }
    }
}
