using System.Collections.Concurrent;
using System.Security.Cryptography;
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

    public ValueTask<Room> CreateRoomAsync()
    {
        var room = new Room
        {
            RoomId = _tokenGenerator.GenerateRoomId(),
            JoinToken = _tokenGenerator.GenerateJoinToken(),
            TeacherToken = _tokenGenerator.GenerateTeacherToken(),
            CreatedAt = DateTime.UtcNow,
            LastActivityAt = DateTime.UtcNow
        };

        _rooms[room.RoomId] = room;
        return ValueTask.FromResult(room);
    }

    public ValueTask<Room?> GetRoomAsync(string roomId)
    {
        _rooms.TryGetValue(roomId, out var room);
        return ValueTask.FromResult(room);
    }

    public ValueTask<bool> RemoveRoomAsync(string roomId) =>
        ValueTask.FromResult(_rooms.TryRemove(roomId, out _));

    public ValueTask<bool> ValidateJoinTokenAsync(string roomId, string joinToken)
    {
        if (!_rooms.TryGetValue(roomId, out var room))
            return ValueTask.FromResult(false);

        return ValueTask.FromResult(room.JoinToken == joinToken);
    }

    public ValueTask<bool> ValidateTeacherTokenAsync(string roomId, string teacherToken)
    {
        if (string.IsNullOrEmpty(teacherToken))
            return ValueTask.FromResult(false);

        if (!_rooms.TryGetValue(roomId, out var room))
            return ValueTask.FromResult(false);

        // Constant-time comparison to avoid leaking token length/prefix via timing.
        var expected = System.Text.Encoding.UTF8.GetBytes(room.TeacherToken);
        var actual = System.Text.Encoding.UTF8.GetBytes(teacherToken);
        var match = CryptographicOperations.FixedTimeEquals(expected, actual);
        return ValueTask.FromResult(match);
    }

    public ValueTask<Student> AddStudentAsync(string roomId, string connectionId, string? displayName = null)
    {
        if (!_rooms.TryGetValue(roomId, out var room))
            throw new InvalidOperationException("Room not found");

        lock (room.SyncRoot)
        {
            if (room.Participants.Count >= room.Settings.MaxStudents)
            {
                throw new InvalidOperationException($"Room is full (max {room.Settings.MaxStudents} students)");
            }

            var studentNumber = ++room.StudentCounter;

            // Use provided name or generate default
            var finalDisplayName = string.IsNullOrWhiteSpace(displayName)
                ? $"Student {studentNumber}"
                : displayName.Trim();

            var student = new Student
            {
                StudentId = Guid.NewGuid().ToString(),
                StudentSessionToken = CreateStudentSessionToken(room),
                DisplayName = finalDisplayName,
                ConnectionId = connectionId,
                IsConnected = true,
                ConnectedAt = DateTime.UtcNow,
                LastSeenAt = DateTime.UtcNow
            };

            room.Participants.Add(student);
            room.LastActivityAt = DateTime.UtcNow;

            return ValueTask.FromResult(student);
        }
    }

    public ValueTask<Student?> ResumeStudentAsync(string roomId, string studentSessionToken, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(studentSessionToken))
            return ValueTask.FromResult<Student?>(null);

        if (!_rooms.TryGetValue(roomId, out var room))
            return ValueTask.FromResult<Student?>(null);

        lock (room.SyncRoot)
        {
            var student = room.Participants.FirstOrDefault(s => s.StudentSessionToken == studentSessionToken);
            if (student == null)
                return ValueTask.FromResult<Student?>(null);

            student.ConnectionId = connectionId;
            student.IsConnected = true;
            student.DisconnectedAt = null;
            student.LastSeenAt = DateTime.UtcNow;
            room.LastActivityAt = DateTime.UtcNow;

            return ValueTask.FromResult<Student?>(student);
        }
    }

    public ValueTask<(Room? Room, Student? Student)> MarkStudentDisconnectedAsync(string connectionId)
    {
        foreach (var room in _rooms.Values)
        {
            lock (room.SyncRoot)
            {
                var student = room.Participants.FirstOrDefault(s => s.ConnectionId == connectionId);
                if (student == null)
                    continue;

                student.IsConnected = false;
                student.DisconnectedAt = DateTime.UtcNow;
                student.LastSeenAt = DateTime.UtcNow;
                room.LastActivityAt = DateTime.UtcNow;

                return ValueTask.FromResult<(Room?, Student?)>((room, student));
            }
        }

        return ValueTask.FromResult<(Room?, Student?)>((null, null));
    }

    public ValueTask<bool> RemoveStudentIfStillDisconnectedAsync(string roomId, string studentId, string disconnectedConnectionId)
    {
        if (!_rooms.TryGetValue(roomId, out var room))
            return ValueTask.FromResult(false);

        lock (room.SyncRoot)
        {
            var student = room.Participants.FirstOrDefault(s => s.StudentId == studentId);
            if (student == null || student.IsConnected || student.ConnectionId != disconnectedConnectionId)
                return ValueTask.FromResult(false);

            room.Participants.Remove(student);
            room.LastActivityAt = DateTime.UtcNow;
            return ValueTask.FromResult(true);
        }
    }

    public ValueTask RemoveStudentAsync(string roomId, string studentId)
    {
        if (_rooms.TryGetValue(roomId, out var room))
        {
            lock (room.SyncRoot)
            {
                var student = room.Participants.FirstOrDefault(s => s.StudentId == studentId);
                if (student != null)
                {
                    room.Participants.Remove(student);
                    room.LastActivityAt = DateTime.UtcNow;
                }
            }
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask<Student?> GetStudentByConnectionIdAsync(string connectionId)
    {
        foreach (var room in _rooms.Values)
        {
            Student? student;
            lock (room.SyncRoot)
            {
                student = room.Participants.FirstOrDefault(s => s.ConnectionId == connectionId);
            }

            if (student != null)
                return ValueTask.FromResult<Student?>(student);
        }

        return ValueTask.FromResult<Student?>(null);
    }

    public ValueTask UpdateTeacherSessionAsync(string roomId, string sessionId)
    {
        if (_rooms.TryGetValue(roomId, out var room))
        {
            room.TeacherSessionId = sessionId;
            room.LastActivityAt = DateTime.UtcNow;
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask<IEnumerable<Room>> GetAllRoomsAsync()
    {
        return ValueTask.FromResult<IEnumerable<Room>>(_rooms.Values);
    }

    private static string CreateStudentSessionToken(Room room)
    {
        string token;
        do
        {
            token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        } while (room.Participants.Any(student => student.StudentSessionToken == token));

        return token;
    }
}
