namespace CedPlan.Domain.Enums;

public enum CalendarEventType
{
    Meeting = 0,
    Deadline = 1,
    Reminder = 2,
    Other = 3
}

public enum AttendeeResponse
{
    NoResponse = 0,
    Accepted = 1,
    Declined = 2,
    Tentative = 3
}
