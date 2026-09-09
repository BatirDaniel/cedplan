using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CedPlan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiAssigneeTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkPackageAssignees",
                columns: table => new
                {
                    WorkPackageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkPackageAssignees", x => new { x.WorkPackageId, x.UserId });
                    table.ForeignKey(
                        name: "FK_WorkPackageAssignees_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkPackageAssignees_WorkPackages_WorkPackageId",
                        column: x => x.WorkPackageId,
                        principalTable: "WorkPackages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkPackageAssignees_UserId",
                table: "WorkPackageAssignees",
                column: "UserId");

            // Carry forward existing single-assignee data into the new many-to-many table.
            migrationBuilder.Sql(@"
                INSERT INTO [WorkPackageAssignees] ([WorkPackageId], [UserId])
                SELECT [Id], [AssigneeId] FROM [WorkPackages] WHERE [AssigneeId] IS NOT NULL;
            ");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkPackages_AspNetUsers_AssigneeId",
                table: "WorkPackages");

            migrationBuilder.DropIndex(
                name: "IX_WorkPackages_AssigneeId",
                table: "WorkPackages");

            migrationBuilder.DropColumn(
                name: "AssigneeId",
                table: "WorkPackages");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkPackageAssignees");

            migrationBuilder.AddColumn<Guid>(
                name: "AssigneeId",
                table: "WorkPackages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkPackages_AssigneeId",
                table: "WorkPackages",
                column: "AssigneeId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkPackages_AspNetUsers_AssigneeId",
                table: "WorkPackages",
                column: "AssigneeId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
