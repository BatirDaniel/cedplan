namespace CedPlan.Application.Common;

/// <summary>
/// Thrown by a use-case class when a referenced resource doesn't exist. Controllers catch this and map
/// it to a 404 — with the message as the body when one is given, or an empty 404 when not, matching
/// whichever shape the original inline controller code used to return.
/// </summary>
public class NotFoundException : Exception
{
    public NotFoundException(string? message = null) : base(message) { }
}
