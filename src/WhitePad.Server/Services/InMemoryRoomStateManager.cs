using System.Collections.Concurrent;
using WhitePad.Server.Models;

namespace WhitePad.Server.Services;

public class InMemoryRoomStateManager : IRoomStateManager
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private readonly ITokenGenerator _tokenGenerator;

    public InMemoryRoomStateManager(ITokenGenerator tokenGenerator)
    {
        _tokenGenerator = tokenGenerator;
    }

    public Task<Room> CreateRoomAsync()
    {
        var room = new Room
        {
            RoomId = _tokenGenerator.GenerateRoomId(),
            JoinToken = _tokenGenerator.GenerateJoinToken(),
            CreatedAt = DateTime.UtcNow,
            LastActivityAt = DateTime.UtcNow
        };

        _rooms[room.RoomId] = room;
        return Task.FromResult(room);
    }

    public Task<Room?> GetRoomAsync(string roomId)
    {
        _rooms.TryGetValue(roomId, out var room);
        return Task.FromResult(room);
    }

    public Task<bool> ValidateJoinTokenAsync(string roomId, string joinToken)
    {
        if (!_rooms.TryGetValue(roomId, out var room))
            return Task.FromResult(false);

        return Task.FromResult(room.JoinToken == joinToken);
    }

    public Task<Student> AddStudentAsync(string roomId, string connectionId, string? displayName = null)
    {
        if (!_rooms.TryGetValue(roomId, out var room))
            throw new InvalidOperationException("Room not found");

        var studentNumber = ++room.StudentCounter;

        // Use provided name or generate default
        var finalDisplayName = string.IsNullOrWhiteSpace(displayName)
            ? $"Student {studentNumber}"
            : displayName.Trim();

        var student = new Student
        {
            StudentId = Guid.NewGuid().ToString(),
            DisplayName = finalDisplayName,
            ConnectionId = connectionId,
            ConnectedAt = DateTime.UtcNow,
            LastSeenAt = DateTime.UtcNow
        };

        room.Participants.Add(student);
        room.LastActivityAt = DateTime.UtcNow;

        return Task.FromResult(student);
    }

    public Task RemoveStudentAsync(string roomId, string studentId)
    {
        if (_rooms.TryGetValue(roomId, out var room))
        {
            var student = room.Participants.FirstOrDefault(s => s.StudentId == studentId);
            if (student != null)
            {
                room.Participants.Remove(student);
                room.LastActivityAt = DateTime.UtcNow;
            }
        }

        return Task.CompletedTask;
    }

    public Task<Student?> GetStudentByConnectionIdAsync(string connectionId)
    {
        foreach (var room in _rooms.Values)
        {
            var student = room.Participants.FirstOrDefault(s => s.ConnectionId == connectionId);
            if (student != null)
                return Task.FromResult<Student?>(student);
        }

        return Task.FromResult<Student?>(null);
    }

    public Task UpdateTeacherSessionAsync(string roomId, string sessionId)
    {
        if (_rooms.TryGetValue(roomId, out var room))
        {
            room.TeacherSessionId = sessionId;
            room.LastActivityAt = DateTime.UtcNow;
        }

        return Task.CompletedTask;
    }

    public Task<IEnumerable<Room>> GetAllRoomsAsync()
    {
        return Task.FromResult<IEnumerable<Room>>(_rooms.Values);
    }
}
