using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CedPlan.Infrastructure.Hubs;

[Authorize]
public class CommentsHub : Hub
{
    public static string GroupName(Guid workPackageId) => $"wp-{workPackageId}";

    public async Task JoinWorkPackage(Guid workPackageId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(workPackageId));
    }

    public async Task LeaveWorkPackage(Guid workPackageId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(workPackageId));
    }
}
