namespace WhitePad.Server.Models;

public class Student
{
    public string StudentId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public string InputMode { get; set; } = "draw"; // "draw" or "type"
    public string ConfidenceLevel { get; set; } = "none"; // "none", "red", "amber", "green"
    public bool IsLocked { get; set; } = false; // Individual student lock state
    public DateTime ConnectedAt { get; set; }
    public DateTime LastSeenAt { get; set; }
}
