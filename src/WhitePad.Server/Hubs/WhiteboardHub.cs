using Microsoft.AspNetCore.SignalR;
using WhitePad.Server.Models;
using WhitePad.Server.Models.Messages;
using WhitePad.Server.Services;

namespace WhitePad.Server.Hubs;

public class WhiteboardHub : Hub<IWhiteboardClient>
{
    private readonly IRoomStateManager _roomStateManager;
    private readonly ILogger<WhiteboardHub> _logger;

    public WhiteboardHub(IRoomStateManager roomStateManager, ILogger<WhiteboardHub> logger)
    {
        _roomStateManager = roomStateManager;
        _logger = logger;
    }

    // Teacher creates a room
    public async Task<CreateRoomResponse> CreateRoom()
    {
        var room = await _roomStateManager.CreateRoomAsync();

        _logger.LogInformation("Room created: {RoomId}", room.RoomId);

        return new CreateRoomResponse
        {
            RoomId = room.RoomId,
            JoinToken = room.JoinToken,
            JoinUrl = $"https://localhost:5001/join?room={room.RoomId}&token={room.JoinToken}",
            CreatedAt = room.CreatedAt
        };
    }

    // Teacher joins room to view dashboard
    public async Task JoinRoomAsTeacher(string roomId)
    {
        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Teacher tried to join non-existent room: {RoomId}", roomId);
            return;
        }

        await _roomStateManager.UpdateTeacherSessionAsync(roomId, Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, $"room:{roomId}:teacher");

        _logger.LogInformation("Teacher joined room: {RoomId}", roomId);

        // Send current participants to teacher
        foreach (var student in room.Participants)
        {
            await Clients.Caller.ParticipantJoined(new ParticipantJoined
            {
                StudentId = student.StudentId,
                DisplayName = student.DisplayName,
                ConnectedAt = student.ConnectedAt,
                InputMode = student.InputMode
            });
        }
    }

    // Student joins room
    public async Task<JoinRoomResponse> JoinRoomAsStudent(string roomId, string joinToken, string? displayName = null)
    {
        _logger.LogInformation("Student attempting to join room: {RoomId} with name: {DisplayName}", roomId, displayName ?? "auto-generated");

        // Validate room and token
        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            return new JoinRoomResponse { Success = false, Error = "Room not found" };
        }

        var isValidToken = await _roomStateManager.ValidateJoinTokenAsync(roomId, joinToken);
        if (!isValidToken)
        {
            return new JoinRoomResponse { Success = false, Error = "Invalid or expired join token" };
        }

        if (room.Participants.Count >= room.Settings.MaxStudents)
        {
            return new JoinRoomResponse { Success = false, Error = $"Room is full (max {room.Settings.MaxStudents} students)" };
        }

        // Add student to room with custom name if provided
        var student = await _roomStateManager.AddStudentAsync(roomId, Context.ConnectionId, displayName);
        await Groups.AddToGroupAsync(Context.ConnectionId, $"room:{roomId}:students");

        _logger.LogInformation("Student joined: {StudentId} ({DisplayName}) in room {RoomId}", student.StudentId, student.DisplayName, roomId);

        // Notify teacher
        await Clients.Group($"room:{roomId}:teacher").ParticipantJoined(new ParticipantJoined
        {
            StudentId = student.StudentId,
            DisplayName = student.DisplayName,
            ConnectedAt = student.ConnectedAt,
            InputMode = student.InputMode
        });

        return new JoinRoomResponse
        {
            Success = true,
            StudentId = student.StudentId,
            DisplayName = student.DisplayName,
            RoomSettings = room.Settings
        };
    }

    // Student sends stroke batch
    public async Task SendStrokeBatch(StrokeBatch batch)
    {
        // Get student info from connection
        var student = await _roomStateManager.GetStudentByConnectionIdAsync(Context.ConnectionId);
        if (student == null)
        {
            _logger.LogWarning("Unknown student tried to send stroke: {ConnectionId}", Context.ConnectionId);
            return;
        }

        // Set student ID on batch (security - don't trust client)
        batch.StudentId = student.StudentId;

        // Find which room this student is in
        string? roomId = null;
        foreach (var room in await GetAllRoomsAsync())
        {
            if (room.Participants.Any(s => s.StudentId == student.StudentId))
            {
                roomId = room.RoomId;
                break;
            }
        }

        if (roomId == null)
        {
            _logger.LogWarning("Student {StudentId} not in any room", student.StudentId);
            return;
        }

        // Send to teacher only
        await Clients.Group($"room:{roomId}:teacher").ReceiveStrokeBatch(batch);
    }

    // Student sets confidence level
    public async Task SetConfidence(string confidenceLevel)
    {
        var connectionId = Context.ConnectionId;

        // Validate confidence level
        var validLevels = new[] { "none", "red", "amber", "green" };
        if (!validLevels.Contains(confidenceLevel))
        {
            _logger.LogWarning("Invalid confidence level: {ConfidenceLevel}", confidenceLevel);
            return;
        }

        // Find student's room
        var rooms = await _roomStateManager.GetAllRoomsAsync();
        var room = rooms.FirstOrDefault(r => r.Participants.Any(p => p.ConnectionId == connectionId));

        if (room == null)
        {
            _logger.LogWarning("Student not in any room, cannot set confidence");
            return;
        }

        var student = room.Participants.FirstOrDefault(p => p.ConnectionId == connectionId);
        if (student == null) return;

        // Update confidence level
        student.ConfidenceLevel = confidenceLevel;
        student.LastSeenAt = DateTime.UtcNow;

        _logger.LogInformation("Student {StudentId} set confidence to {Level}", student.StudentId, confidenceLevel);

        // Notify teacher
        var message = new ConfidenceChanged
        {
            StudentId = student.StudentId,
            ConfidenceLevel = confidenceLevel
        };

        await Clients.Group($"room:{room.RoomId}:teacher").ConfidenceChanged(message);
    }

    // Student undoes a stroke
    public async Task UndoStroke(string strokeId)
    {
        var connectionId = Context.ConnectionId;

        // Find student's room
        var rooms = await _roomStateManager.GetAllRoomsAsync();
        var room = rooms.FirstOrDefault(r => r.Participants.Any(p => p.ConnectionId == connectionId));

        if (room == null)
        {
            _logger.LogWarning("Student not in any room, cannot undo stroke");
            return;
        }

        var student = room.Participants.FirstOrDefault(p => p.ConnectionId == connectionId);
        if (student == null) return;

        _logger.LogInformation("Student {StudentId} undid stroke {StrokeId}", student.StudentId, strokeId);

        // Notify teacher
        var message = new StrokeUndone
        {
            StudentId = student.StudentId,
            StrokeId = strokeId
        };

        await Clients.Group($"room:{room.RoomId}:teacher").StrokeUndone(message);
    }

    // Student clears their board
    public async Task ClearBoard()
    {
        var connectionId = Context.ConnectionId;

        // Find student's room
        var rooms = await _roomStateManager.GetAllRoomsAsync();
        var room = rooms.FirstOrDefault(r => r.Participants.Any(p => p.ConnectionId == connectionId));

        if (room == null)
        {
            _logger.LogWarning("Student not in any room, cannot clear board");
            return;
        }

        var student = room.Participants.FirstOrDefault(p => p.ConnectionId == connectionId);
        if (student == null) return;

        _logger.LogInformation("Student {StudentId} cleared their board", student.StudentId);

        // Notify teacher
        var message = new BoardCleared
        {
            StudentId = student.StudentId
        };

        await Clients.Group($"room:{room.RoomId}:teacher").BoardCleared(message);
    }

    // Handle disconnect
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Connection disconnected: {ConnectionId}", Context.ConnectionId);

        var student = await _roomStateManager.GetStudentByConnectionIdAsync(Context.ConnectionId);

        if (student == null)
        {
            _logger.LogInformation("No student found for connection {ConnectionId}, might be teacher", Context.ConnectionId);
            await base.OnDisconnectedAsync(exception);
            return;
        }

        _logger.LogInformation("Found student {StudentId} ({DisplayName}) for disconnection", student.StudentId, student.DisplayName);

        // Find and remove from room
        var rooms = await GetAllRoomsAsync();
        foreach (var room in rooms)
        {
            if (room.Participants.Any(s => s.StudentId == student.StudentId))
            {
                _logger.LogInformation("Removing student {StudentId} from room {RoomId}", student.StudentId, room.RoomId);

                await _roomStateManager.RemoveStudentAsync(room.RoomId, student.StudentId);

                // Notify teacher
                var leftMessage = new ParticipantLeft
                {
                    StudentId = student.StudentId,
                    Reason = "disconnect",
                    LeftAt = DateTime.UtcNow
                };

                await Clients.Group($"room:{room.RoomId}:teacher").ParticipantLeft(leftMessage);

                _logger.LogInformation("Sent ParticipantLeft notification for student {StudentId} to group room:{RoomId}:teacher",
                    student.StudentId, room.RoomId);
                break;
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task<IEnumerable<Room>> GetAllRoomsAsync()
    {
        return await _roomStateManager.GetAllRoomsAsync();
    }
}
