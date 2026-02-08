namespace WhitePad.Server.Models;

public class Room
{
    public string RoomId { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string JoinToken { get; set; } = string.Empty;
    public string? TeacherSessionId { get; set; }
    public List<Student> Participants { get; set; } = new();
    public RoomSettings Settings { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivityAt { get; set; }
    public int StudentCounter { get; set; } = 0; // For auto-naming students
    public bool WaitingRoomEnabled { get; set; } = true; // Is waiting room feature enabled (checkbox)
    public bool WaitingRoomUnlocked { get; set; } = false; // Has teacher clicked "Unlock and View"
}
