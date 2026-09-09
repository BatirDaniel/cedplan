using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CedPlan.Api.Hubs;

[Authorize]
public class NotificationsHub : Hub
{
    public static string GroupName(Guid userId) => $"user-{userId}";

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userId, out var id))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(id));
        }
        await base.OnConnectedAsync();
    }
}
