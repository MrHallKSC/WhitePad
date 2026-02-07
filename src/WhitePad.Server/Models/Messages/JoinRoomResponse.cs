namespace WhitePad.Server.Models.Messages;

public class JoinRoomResponse
{
    public bool Success { get; set; }
    public string? StudentId { get; set; }
    public string? DisplayName { get; set; }
    public RoomSettings? RoomSettings { get; set; }
    public string? Error { get; set; }
}
