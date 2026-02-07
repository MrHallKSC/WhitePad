namespace WhitePad.Server.Models;

public class Student
{
    public string StudentId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public string InputMode { get; set; } = "draw"; // "draw" or "type"
    public DateTime ConnectedAt { get; set; }
    public DateTime LastSeenAt { get; set; }
}
