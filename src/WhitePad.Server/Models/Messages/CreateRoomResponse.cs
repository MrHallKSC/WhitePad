namespace WhitePad.Server.Models.Messages;

public class CreateRoomResponse
{
    public string RoomId { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string JoinToken { get; set; } = string.Empty;
    public string TeacherToken { get; set; } = string.Empty;
    public string JoinUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
