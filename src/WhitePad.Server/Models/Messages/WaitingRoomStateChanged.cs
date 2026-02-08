namespace WhitePad.Server.Models.Messages;

public class WaitingRoomStateChanged
{
    public bool WaitingRoomEnabled { get; set; }
    public bool WaitingRoomUnlocked { get; set; }
}
