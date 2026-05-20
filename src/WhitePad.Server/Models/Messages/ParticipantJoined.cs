namespace WhitePad.Server.Models.Messages;

public class ParticipantJoined
{
    public string StudentId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime ConnectedAt { get; set; }
    public string InputMode { get; set; } = "draw";
    public bool HasAnswered { get; set; }
    public string ConfidenceLevel { get; set; } = "none";
    public bool IsLocked { get; set; }
}
