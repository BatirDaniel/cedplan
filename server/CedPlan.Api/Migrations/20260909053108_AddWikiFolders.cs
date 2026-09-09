using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CedPlan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWikiFolders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedById",
                table: "WikiPages",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<int>(
                name: "NodeType",
                table: "WikiPages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentId",
                table: "WikiPages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Position",
                table: "WikiPages",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            // Backfill existing rows: they were all authored by whoever last updated them (no separate author tracked before).
            migrationBuilder.Sql("UPDATE WikiPages SET CreatedById = UpdatedById;");

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_CreatedById",
                table: "WikiPages",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_ParentId",
                table: "WikiPages",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_ProjectId_ParentId",
                table: "WikiPages",
                columns: new[] { "ProjectId", "ParentId" });

            migrationBuilder.AddForeignKey(
                name: "FK_WikiPages_AspNetUsers_CreatedById",
                table: "WikiPages",
                column: "CreatedById",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WikiPages_WikiPages_ParentId",
                table: "WikiPages",
                column: "ParentId",
                principalTable: "WikiPages",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WikiPages_AspNetUsers_CreatedById",
                table: "WikiPages");

            migrationBuilder.DropForeignKey(
                name: "FK_WikiPages_WikiPages_ParentId",
                table: "WikiPages");

            migrationBuilder.DropIndex(
                name: "IX_WikiPages_CreatedById",
                table: "WikiPages");

            migrationBuilder.DropIndex(
                name: "IX_WikiPages_ParentId",
                table: "WikiPages");

            migrationBuilder.DropIndex(
                name: "IX_WikiPages_ProjectId_ParentId",
                table: "WikiPages");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "WikiPages");

            migrationBuilder.DropColumn(
                name: "NodeType",
                table: "WikiPages");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "WikiPages");

            migrationBuilder.DropColumn(
                name: "Position",
                table: "WikiPages");
        }
    }
}
