using WhitePad.Server.Models;

namespace WhitePad.Server.Services;

public interface IRoomStateManager
{
    Task<Room> CreateRoomAsync();
    Task<Room?> GetRoomAsync(string roomId);
    Task<bool> ValidateJoinTokenAsync(string roomId, string joinToken);
    Task<Student> AddStudentAsync(string roomId, string connectionId);
    Task RemoveStudentAsync(string roomId, string studentId);
    Task<Student?> GetStudentByConnectionIdAsync(string connectionId);
    Task UpdateTeacherSessionAsync(string roomId, string sessionId);
}
