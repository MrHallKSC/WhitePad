namespace WhitePad.Server.Models.Messages;

public class StudentLocked
{
    public string StudentId { get; set; } = string.Empty;
    public bool IsLocked { get; set; }
}
