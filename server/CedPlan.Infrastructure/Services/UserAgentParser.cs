using System.Text.RegularExpressions;

namespace CedPlan.Infrastructure.Services;

public record ParsedUserAgent(string Browser, string OperatingSystem, string Device);

/// <summary>Lightweight heuristic User-Agent parser — good enough for the "Active Sessions" display, not a full UA database.</summary>
public static class UserAgentParser
{
    public static ParsedUserAgent Parse(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
            return new ParsedUserAgent("Unknown browser", "Unknown OS", "Unknown device");

        string browser = "Unknown browser";
        if (Regex.IsMatch(userAgent, "Edg/")) browser = "Edge";
        else if (Regex.IsMatch(userAgent, "OPR/|Opera")) browser = "Opera";
        else if (Regex.IsMatch(userAgent, "Chrome/")) browser = "Chrome";
        else if (Regex.IsMatch(userAgent, "Firefox/")) browser = "Firefox";
        else if (Regex.IsMatch(userAgent, "Safari/") && !Regex.IsMatch(userAgent, "Chrome")) browser = "Safari";

        string os = "Unknown OS";
        if (Regex.IsMatch(userAgent, "Windows NT")) os = "Windows";
        else if (Regex.IsMatch(userAgent, "Mac OS X")) os = "macOS";
        else if (Regex.IsMatch(userAgent, "Android")) os = "Android";
        else if (Regex.IsMatch(userAgent, "iPhone|iPad|iOS")) os = "iOS";
        else if (Regex.IsMatch(userAgent, "Linux")) os = "Linux";

        string device = "Desktop";
        if (Regex.IsMatch(userAgent, "Mobile|Android|iPhone")) device = "Mobile";
        else if (Regex.IsMatch(userAgent, "iPad|Tablet")) device = "Tablet";

        return new ParsedUserAgent(browser, os, device);
    }
}
