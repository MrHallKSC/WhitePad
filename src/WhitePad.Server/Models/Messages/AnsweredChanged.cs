namespace WhitePad.Server.Models.Messages;

public class AnsweredChanged
{
    public string StudentId { get; set; } = string.Empty;
    public bool HasAnswered { get; set; }
}
