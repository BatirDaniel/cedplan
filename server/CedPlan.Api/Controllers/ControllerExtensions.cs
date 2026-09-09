using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace CedPlan.Api.Controllers;

public static class ControllerExtensions
{
    public static Guid GetUserId(this ControllerBase controller)
    {
        var sub = controller.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? controller.User.FindFirstValue("sub");
        return Guid.Parse(sub!);
    }

    public static Guid? GetSessionId(this ControllerBase controller)
    {
        var sid = controller.User.FindFirstValue("sid");
        return Guid.TryParse(sid, out var id) ? id : null;
    }
}
