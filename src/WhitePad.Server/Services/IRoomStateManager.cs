using WhitePad.Server.Models;

namespace WhitePad.Server.Services;

public interface IRoomStateManager
{
    ValueTask<Room> CreateRoomAsync();
    ValueTask<Room?> GetRoomAsync(string roomId);
    ValueTask<bool> RemoveRoomAsync(string roomId);
    ValueTask<bool> ValidateJoinTokenAsync(string roomId, string joinToken);
    ValueTask<bool> ValidateTeacherTokenAsync(string roomId, string teacherToken);
    ValueTask<Student> AddStudentAsync(string roomId, string connectionId, string? displayName = null);
    ValueTask<Student?> ResumeStudentAsync(string roomId, string studentSessionToken, string connectionId);
    ValueTask<(Room? Room, Student? Student)> MarkStudentDisconnectedAsync(string connectionId);
    ValueTask<bool> RemoveStudentIfStillDisconnectedAsync(string roomId, string studentId, string disconnectedConnectionId);
    ValueTask RemoveStudentAsync(string roomId, string studentId);
    ValueTask<Student?> GetStudentByConnectionIdAsync(string connectionId);
    ValueTask UpdateTeacherSessionAsync(string roomId, string sessionId);
    ValueTask<IEnumerable<Room>> GetAllRoomsAsync();
}
