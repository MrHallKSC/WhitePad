namespace WhitePad.Server.Models;

public class RoomSettings
{
    public bool IsLocked { get; set; }
    public bool IsFrozen { get; set; }
    public int MaxStudents { get; set; } = 28;
}
