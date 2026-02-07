namespace WhitePad.Server.Models.Messages;

public class JoinRoomRequest
{
    public string RoomId { get; set; } = string.Empty;
    public string JoinToken { get; set; } = string.Empty;
}
