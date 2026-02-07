namespace WhitePad.Server.Models.Messages;

public class ConfidenceChanged
{
    public string StudentId { get; set; } = string.Empty;
    public string ConfidenceLevel { get; set; } = "none"; // "none", "red", "amber", "green"
}
