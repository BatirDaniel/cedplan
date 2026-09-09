using CedPlan.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CedPlan.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<WorkPackage> WorkPackages => Set<WorkPackage>();
    public DbSet<WorkPackageAssignee> WorkPackageAssignees => Set<WorkPackageAssignee>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<WikiPage> WikiPages => Set<WikiPage>();
    public DbSet<WikiPageVersion> WikiPageVersions => Set<WikiPageVersion>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();
    public DbSet<CalendarEventAttendee> CalendarEventAttendees => Set<CalendarEventAttendee>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Project>(e =>
        {
            e.HasIndex(p => p.Identifier).IsUnique();
        });

        builder.Entity<ProjectMember>(e =>
        {
            e.HasIndex(m => new { m.ProjectId, m.UserId }).IsUnique();
            e.HasOne(m => m.Project).WithMany(p => p.Members).HasForeignKey(m => m.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.User).WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<WorkPackage>(e =>
        {
            e.HasOne(w => w.Project).WithMany(p => p.WorkPackages).HasForeignKey(w => w.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(w => w.Parent).WithMany(w => w.Children).HasForeignKey(w => w.ParentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(w => w.Author).WithMany().HasForeignKey(w => w.AuthorId).OnDelete(DeleteBehavior.Restrict);
            e.Property(w => w.EstimatedHours).HasColumnType("float");
        });

        builder.Entity<WorkPackageAssignee>(e =>
        {
            e.HasKey(a => new { a.WorkPackageId, a.UserId });
            e.HasOne(a => a.WorkPackage).WithMany(w => w.Assignees).HasForeignKey(a => a.WorkPackageId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Comment>(e =>
        {
            e.HasOne(c => c.WorkPackage).WithMany(w => w.Comments).HasForeignKey(c => c.WorkPackageId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.Author).WithMany().HasForeignKey(c => c.AuthorId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<TimeEntry>(e =>
        {
            e.HasOne(t => t.WorkPackage).WithMany(w => w.TimeEntries).HasForeignKey(t => t.WorkPackageId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Restrict);
            e.Property(t => t.Hours).HasColumnType("float");
        });

        builder.Entity<WikiPage>(e =>
        {
            e.HasOne(w => w.Project).WithMany(p => p.WikiPages).HasForeignKey(w => w.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(w => w.UpdatedBy).WithMany().HasForeignKey(w => w.UpdatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(w => w.CreatedBy).WithMany().HasForeignKey(w => w.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(w => w.Parent).WithMany(w => w.Children).HasForeignKey(w => w.ParentId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(w => new { w.ProjectId, w.Slug }).IsUnique();
            e.HasIndex(w => new { w.ProjectId, w.ParentId });
        });

        builder.Entity<WikiPageVersion>(e =>
        {
            e.HasOne(v => v.WikiPage).WithMany().HasForeignKey(v => v.WikiPageId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(v => v.SavedBy).WithMany().HasForeignKey(v => v.SavedById).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(v => new { v.WikiPageId, v.CreatedAt });
        });

        builder.Entity<UserSession>(e =>
        {
            e.HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Notification>(e =>
        {
            e.HasOne(n => n.Recipient).WithMany().HasForeignKey(n => n.RecipientId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(n => n.Actor).WithMany().HasForeignKey(n => n.ActorId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(n => n.Project).WithMany().HasForeignKey(n => n.ProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(n => n.WorkPackage).WithMany().HasForeignKey(n => n.WorkPackageId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(n => new { n.RecipientId, n.IsRead });
        });

        builder.Entity<Permission>(e =>
        {
            e.HasKey(p => p.Key);
        });

        builder.Entity<RolePermission>(e =>
        {
            e.HasKey(rp => new { rp.Role, rp.PermissionKey });
            e.HasOne(rp => rp.Permission).WithMany().HasForeignKey(rp => rp.PermissionKey).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CalendarEvent>(e =>
        {
            e.HasOne(x => x.Project).WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
            // Restrict, not Cascade/SetNull: CalendarEvent is reachable from Project both directly and via
            // WorkPackage (which itself cascades from Project) — SQL Server rejects the resulting multiple
            // cascade paths. The link is cleared explicitly in WorkPackagesController.Delete instead.
            e.HasOne(x => x.WorkPackage).WithMany().HasForeignKey(x => x.WorkPackageId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.ProjectId, x.StartsAt });
            e.HasIndex(x => x.StartsAt);
            e.HasIndex(x => x.WorkPackageId);
        });

        builder.Entity<CalendarEventAttendee>(e =>
        {
            e.HasKey(a => new { a.CalendarEventId, a.UserId });
            e.HasOne(a => a.CalendarEvent).WithMany(x => x.Attendees).HasForeignKey(a => a.CalendarEventId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(a => a.UserId);
        });

        // Every DateTime column in this app is written as DateTime.UtcNow (verified: no DateTime.Now/.Today
        // usage anywhere in the backend), but SQL Server hands it back with Kind=Unspecified, which
        // System.Text.Json then serializes WITHOUT a trailing "Z" — so the browser parses it as local time.
        // This stamps Kind=Utc on every DateTime/DateTime? property on read. It's identity on write (no
        // migration, no data rewrite) and fixes in-process comparisons too, not just the JSON wire format.
        var utcConverter = new ValueConverter<DateTime, DateTime>(
            v => v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var utcNullableConverter = new ValueConverter<DateTime?, DateTime?>(
            v => v,
            v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime)) property.SetValueConverter(utcConverter);
                else if (property.ClrType == typeof(DateTime?)) property.SetValueConverter(utcNullableConverter);
            }
        }
    }
}
