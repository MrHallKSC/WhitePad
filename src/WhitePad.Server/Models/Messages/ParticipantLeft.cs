namespace WhitePad.Server.Models.Messages;

public class ParticipantLeft
{
    public string StudentId { get; set; } = string.Empty;
    public string Reason { get; set; } = "disconnect"; // "disconnect", "kick", "roomEnded"
    public DateTime LeftAt { get; set; }
}
