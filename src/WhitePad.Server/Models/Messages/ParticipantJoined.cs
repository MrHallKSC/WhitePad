namespace WhitePad.Server.Models.Messages;

public class ParticipantJoined
{
    public string StudentId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime ConnectedAt { get; set; }
    public string InputMode { get; set; } = "draw";
}
