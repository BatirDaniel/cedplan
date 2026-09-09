namespace CedPlan.Application.Common;

/// <summary>
/// Thrown by a use-case class when a request violates a business rule (not a permission failure —
/// those stay in the controller's authorization guard). Controllers catch this and map it to a 400
/// response using <see cref="Message"/> verbatim, so the message text IS the API contract — keep it
/// identical to what the endpoint returned before this logic moved out of the controller.
/// </summary>
public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}
