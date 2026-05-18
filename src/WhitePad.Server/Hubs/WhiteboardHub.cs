using Microsoft.AspNetCore.SignalR;
using WhitePad.Server.Models;
using WhitePad.Server.Models.Messages;
using WhitePad.Server.Services;

namespace WhitePad.Server.Hubs;

public class WhiteboardHub : Hub<IWhiteboardClient>
{
    private readonly IRoomStateManager _roomStateManager;
    private readonly ILogger<WhiteboardHub> _logger;
    private const int MaxQuestionLength = 280;
    private const string EraserStrokeMarker = "-eraser-";
    private const string EraserColorSentinel = "__WHITEPAD_ERASER__";

    public WhiteboardHub(IRoomStateManager roomStateManager, ILogger<WhiteboardHub> logger)
    {
        _roomStateManager = roomStateManager;
        _logger = logger;
    }

    // Teacher creates a room
    public async Task<CreateRoomResponse> CreateRoom(string roomName, bool useLocalhostJoinUrl = false)
    {
        var room = await _roomStateManager.CreateRoomAsync();
        room.RoomName = roomName;

        _logger.LogInformation("Room created: {RoomId} - {RoomName}", room.RoomId, roomName);

        var joinHost = useLocalhostJoinUrl ? "localhost" : NetworkUtility.GetLocalIPAddress();
        var joinUrl = $"https://{joinHost}:5001/join?roomId={room.RoomId}&token={room.JoinToken}";

        _logger.LogInformation("Join URL for room {RoomId}: {JoinUrl}", room.RoomId, joinUrl);

        return new CreateRoomResponse
        {
            RoomId = room.RoomId,
            RoomName = roomName,
            JoinToken = room.JoinToken,
            JoinUrl = joinUrl,
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
        await Groups.AddToGroupAsync(Context.ConnectionId, TeacherGroup(roomId));

        _logger.LogInformation("Teacher joined room: {RoomId}", roomId);

        // Send current participants to teacher
        foreach (var student in room.Participants)
        {
            await Clients.Caller.ParticipantJoined(ToParticipantJoined(student));
        }

        await Clients.Caller.QuestionChanged(new QuestionChanged
        {
            Question = room.CurrentQuestion
        });
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
        await Groups.AddToGroupAsync(Context.ConnectionId, StudentsGroup(roomId));

        _logger.LogInformation("Student joined: {StudentId} ({DisplayName}) in room {RoomId}", student.StudentId, student.DisplayName, roomId);

        // If waiting room is enabled and not unlocked, lock the student immediately
        if (room.WaitingRoomEnabled && !room.WaitingRoomUnlocked)
        {
            student.IsLocked = true;
            _logger.LogInformation("Student {StudentId} locked on join (waiting room enabled and not unlocked)", student.StudentId);
        }

        // Notify teacher
        await Clients.Group(TeacherGroup(roomId)).ParticipantJoined(ToParticipantJoined(student));

        // If student was locked, notify them and the teacher
        if (student.IsLocked)
        {
            var lockMessage = new StudentLocked
            {
                StudentId = student.StudentId,
                IsLocked = true
            };

            // Notify the teacher
            await Clients.Group(TeacherGroup(roomId)).StudentLocked(lockMessage);
        }

        return new JoinRoomResponse
        {
            Success = true,
            StudentId = student.StudentId,
            DisplayName = student.DisplayName,
            RoomSettings = room.Settings,
            IsLocked = student.IsLocked,
            WaitingRoomEnabled = room.WaitingRoomEnabled,
            WaitingRoomUnlocked = room.WaitingRoomUnlocked,
            CurrentQuestion = room.CurrentQuestion
        };
    }

    // Student sends stroke batch
    public async Task SendStrokeBatch(StrokeBatch batch)
    {
        var (room, student) = await GetRoomAndStudentByConnectionIdAsync(Context.ConnectionId);
        if (student == null)
        {
            _logger.LogWarning("Unknown student tried to send stroke: {ConnectionId}", Context.ConnectionId);
            return;
        }

        // Set student ID on batch (security - don't trust client)
        batch.StudentId = student.StudentId;
        batch.IsEraser = batch.IsEraser ||
            batch.StrokeId.Contains(EraserStrokeMarker, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(batch.Color, EraserColorSentinel, StringComparison.Ordinal) ||
            batch.LineWidth < 0;

        if (room == null)
        {
            _logger.LogWarning("Student {StudentId} not in any room", student.StudentId);
            return;
        }

        // Send to teacher only
        await Clients.Group(TeacherGroup(room.RoomId)).ReceiveStrokeBatch(batch);
    }

    // Student sends shape
    public async Task SendShape(Shape shape)
    {
        var (room, student) = await GetRoomAndStudentByConnectionIdAsync(Context.ConnectionId);
        if (student == null)
        {
            _logger.LogWarning("Unknown student tried to send shape: {ConnectionId}", Context.ConnectionId);
            return;
        }

        // Set student ID on shape (security - don't trust client)
        shape.StudentId = student.StudentId;

        if (room == null)
        {
            _logger.LogWarning("Student {StudentId} not in any room", student.StudentId);
            return;
        }

        var shapeDrawn = ToShapeDrawn(shape);

        // Send to teacher only
        await Clients.Group(TeacherGroup(room.RoomId)).ReceiveShape(shapeDrawn);
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

        var (room, student) = await GetRoomAndStudentByConnectionIdAsync(connectionId);
        if (room == null)
        {
            _logger.LogWarning("Student not in any room, cannot set confidence");
            return;
        }

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

        await Clients.Group(TeacherGroup(room.RoomId)).ConfidenceChanged(message);
    }

    // Student undoes a stroke
    public async Task UndoStroke(string strokeId)
    {
        var connectionId = Context.ConnectionId;

        var (room, student) = await GetRoomAndStudentByConnectionIdAsync(connectionId);
        if (room == null)
        {
            _logger.LogWarning("Student not in any room, cannot undo stroke");
            return;
        }

        if (student == null) return;

        _logger.LogInformation("Student {StudentId} undid stroke {StrokeId}", student.StudentId, strokeId);

        // Notify teacher
        var message = new StrokeUndone
        {
            StudentId = student.StudentId,
            StrokeId = strokeId
        };

        await Clients.Group(TeacherGroup(room.RoomId)).StrokeUndone(message);
    }

    // Student clears their board
    public async Task ClearBoard()
    {
        var connectionId = Context.ConnectionId;

        var (room, student) = await GetRoomAndStudentByConnectionIdAsync(connectionId);
        if (room == null)
        {
            _logger.LogWarning("Student not in any room, cannot clear board");
            return;
        }

        if (student == null) return;

        _logger.LogInformation("Student {StudentId} cleared their board", student.StudentId);

        // Notify teacher
        var message = new BoardCleared
        {
            StudentId = student.StudentId
        };

        await Clients.Group(TeacherGroup(room.RoomId)).BoardCleared(message);
    }

    // Teacher locks individual student
    public async Task LockStudent(string roomId, string studentId)
    {
        _logger.LogInformation("Teacher locking student {StudentId} in room {RoomId}", studentId, roomId);

        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        var student = room.Participants.FirstOrDefault(s => s.StudentId == studentId);
        if (student == null)
        {
            _logger.LogWarning("Student not found: {StudentId}", studentId);
            return;
        }

        await SetStudentLockStateAndNotifyAsync(roomId, student, isLocked: true);
    }

    // Teacher unlocks individual student
    public async Task UnlockStudent(string roomId, string studentId)
    {
        _logger.LogInformation("Teacher unlocking student {StudentId} in room {RoomId}", studentId, roomId);

        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        var student = room.Participants.FirstOrDefault(s => s.StudentId == studentId);
        if (student == null)
        {
            _logger.LogWarning("Student not found: {StudentId}", studentId);
            return;
        }

        await SetStudentLockStateAndNotifyAsync(roomId, student, isLocked: false);
    }

    // Teacher locks all students
    public async Task LockAllStudents(string roomId)
    {
        _logger.LogInformation("Teacher locking all students in room {RoomId}", roomId);

        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        foreach (var student in room.Participants)
        {
            await SetStudentLockStateAndNotifyAsync(roomId, student, isLocked: true);
        }
    }

    // Teacher unlocks all students
    public async Task UnlockAllStudents(string roomId)
    {
        _logger.LogInformation("Teacher unlocking all students in room {RoomId}", roomId);

        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        foreach (var student in room.Participants)
        {
            await SetStudentLockStateAndNotifyAsync(roomId, student, isLocked: false);
        }
    }

    // Teacher kicks a student (disconnects them, sends them back to name input)
    public async Task KickStudent(string roomId, string studentId)
    {
        _logger.LogInformation("Teacher kicking student {StudentId} from room {RoomId}", studentId, roomId);

        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        var student = room.Participants.FirstOrDefault(s => s.StudentId == studentId);
        if (student == null)
        {
            _logger.LogWarning("Student not found: {StudentId}", studentId);
            return;
        }

        var connectionId = student.ConnectionId;

        // Remove student from room
        room.Participants.Remove(student);
        _logger.LogInformation("Removed student {StudentId} from room {RoomId}", studentId, roomId);

        // Notify teacher that student left
        var participantLeft = new ParticipantLeft
        {
            StudentId = studentId
        };
        await Clients.Group(TeacherGroup(roomId)).ParticipantLeft(participantLeft);
        _logger.LogInformation("Sent ParticipantLeft notification for student {StudentId} to group {TeacherGroup}", studentId, TeacherGroup(roomId));

        // Notify the student they've been kicked (sends them back to name input)
        if (!string.IsNullOrEmpty(connectionId))
        {
            await Clients.Client(connectionId).Kicked();
        }
    }

    // Teacher clears a specific student's board
    public async Task ClearStudentBoard(string roomId, string studentId)
    {
        _logger.LogInformation("Teacher clearing board for student {StudentId} in room {RoomId}", studentId, roomId);

        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        var student = room.Participants.FirstOrDefault(s => s.StudentId == studentId);
        if (student == null)
        {
            _logger.LogWarning("Student not found: {StudentId}", studentId);
            return;
        }

        var boardCleared = new BoardCleared
        {
            StudentId = studentId
        };

        // Notify the student to clear their board
        if (!string.IsNullOrEmpty(student.ConnectionId))
        {
            await Clients.Client(student.ConnectionId).BoardCleared(boardCleared);
        }

        // Notify teacher to clear this student's tile
        await Clients.Group(TeacherGroup(roomId)).BoardCleared(boardCleared);
        _logger.LogInformation("Sent BoardCleared notification for student {StudentId}", studentId);
    }

    // Teacher clears all student boards in the room
    public async Task ClearAllBoards(string roomId)
    {
        _logger.LogInformation("Teacher clearing all boards in room {RoomId}", roomId);

        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        foreach (var student in room.Participants)
        {
            var boardCleared = new BoardCleared
            {
                StudentId = student.StudentId
            };

            // Notify the student to clear their board
            if (!string.IsNullOrEmpty(student.ConnectionId))
            {
                await Clients.Client(student.ConnectionId).BoardCleared(boardCleared);
            }

            // Notify teacher to clear this student's tile
            await Clients.Group(TeacherGroup(roomId)).BoardCleared(boardCleared);
        }

        _logger.LogInformation("Sent BoardCleared notifications for all students in room {RoomId}", roomId);
    }

    // Teacher unlocks waiting room (clicks "Unlock and View")
    public async Task UnlockWaitingRoom(string roomId)
    {
        _logger.LogInformation("Teacher unlocking waiting room in room {RoomId}", roomId);

        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        room.WaitingRoomUnlocked = true;

        // Broadcast waiting room state to all students
        var message = new WaitingRoomStateChanged
        {
            WaitingRoomEnabled = room.WaitingRoomEnabled,
            WaitingRoomUnlocked = true
        };

        await Clients.Group(StudentsGroup(roomId)).WaitingRoomStateChanged(message);
        _logger.LogInformation("Waiting room unlocked in room {RoomId}", roomId);
    }

    // Teacher toggles waiting room checkbox
    public async Task SetWaitingRoomEnabled(string roomId, bool enabled)
    {
        _logger.LogInformation("Teacher setting waiting room enabled={Enabled} in room {RoomId}", enabled, roomId);

        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        // Update the room's waiting room enabled state
        room.WaitingRoomEnabled = enabled;

        if (enabled)
        {
            // Re-enabling waiting room - lock all students and reset unlocked state
            room.WaitingRoomUnlocked = false;

            foreach (var student in room.Participants)
            {
                await SetStudentLockStateAndNotifyAsync(roomId, student, isLocked: true);
            }

            // Broadcast waiting room state to all students
            var message = new WaitingRoomStateChanged
            {
                WaitingRoomEnabled = true,
                WaitingRoomUnlocked = false
            };

            await Clients.Group(StudentsGroup(roomId)).WaitingRoomStateChanged(message);
            _logger.LogInformation("Waiting room enabled and all students locked in room {RoomId}", roomId);
        }
        else
        {
            // Disabling waiting room - unlock all students
            room.WaitingRoomUnlocked = false; // Reset the unlock state

            foreach (var student in room.Participants)
            {
                await SetStudentLockStateAndNotifyAsync(roomId, student, isLocked: false);
            }

            // Broadcast waiting room state to all students
            var message = new WaitingRoomStateChanged
            {
                WaitingRoomEnabled = false,
                WaitingRoomUnlocked = false
            };

            await Clients.Group(StudentsGroup(roomId)).WaitingRoomStateChanged(message);
            _logger.LogInformation("Waiting room disabled and all students unlocked in room {RoomId}", roomId);
        }
    }

    // Student clicks "Join Room" button from waiting room
    public async Task JoinFromWaitingRoom()
    {
        var connectionId = Context.ConnectionId;

        var (room, student) = await GetRoomAndStudentByConnectionIdAsync(connectionId);
        if (room == null)
        {
            _logger.LogWarning("Student not in any room, cannot join from waiting room");
            return;
        }

        if (student == null) return;

        // Only unlock if waiting room has been unlocked by teacher
        if (!room.WaitingRoomUnlocked)
        {
            _logger.LogWarning("Student {StudentId} tried to join but waiting room not unlocked yet", student.StudentId);
            return;
        }

        _logger.LogInformation("Student {StudentId} joined from waiting room in room {RoomId}", student.StudentId, room.RoomId);

        await SetStudentLockStateAndNotifyAsync(room.RoomId, student, isLocked: false);
    }

    // Teacher sets a question for the room
    public async Task SetQuestion(string? roomIdOrQuestion = null, string? question = null)
    {
        var room = await _roomStateManager.GetRoomAsync(roomIdOrQuestion ?? string.Empty);
        string? normalizedQuestionInput;
        string roomId;

        if (room != null)
        {
            // New signature: SetQuestion(roomId, question)
            roomId = room.RoomId;
            normalizedQuestionInput = question;
        }
        else
        {
            // Legacy signature: SetQuestion(question)
            room = await GetRoomByTeacherConnectionIdAsync(Context.ConnectionId);
            if (room == null)
            {
                _logger.LogWarning("No room found for teacher connection {ConnectionId} when setting question", Context.ConnectionId);
                return;
            }

            roomId = room.RoomId;
            normalizedQuestionInput = roomIdOrQuestion;
        }

        _logger.LogInformation("Teacher setting question in room {RoomId}", roomId);

        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return;
        }

        var normalized = string.IsNullOrWhiteSpace(normalizedQuestionInput)
            ? null
            : normalizedQuestionInput.Trim();

        if (!string.IsNullOrEmpty(normalized) && normalized.Length > MaxQuestionLength)
        {
            normalized = normalized[..MaxQuestionLength];
        }

        room.CurrentQuestion = normalized;

        foreach (var student in room.Participants)
        {
            student.HasAnswered = false;
        }

        var message = new QuestionChanged
        {
            Question = room.CurrentQuestion
        };

        await Clients.Group(TeacherGroup(roomId)).QuestionChanged(message);
        await Clients.Group(StudentsGroup(roomId)).QuestionChanged(message);

        foreach (var student in room.Participants)
        {
            await Clients.Group(TeacherGroup(roomId)).AnsweredChanged(new AnsweredChanged
            {
                StudentId = student.StudentId,
                HasAnswered = false
            });
        }
    }

    private async ValueTask<Room?> GetRoomByTeacherConnectionIdAsync(string connectionId)
    {
        var rooms = await _roomStateManager.GetAllRoomsAsync();
        return rooms.FirstOrDefault(room => room.TeacherSessionId == connectionId);
    }

    // Student sets answered state
    public async Task SetAnswered(bool hasAnswered)
    {
        var (room, student) = await GetRoomAndStudentByConnectionIdAsync(Context.ConnectionId);
        if (room == null || student == null)
        {
            _logger.LogWarning("Student not in any room, cannot set answered");
            return;
        }

        student.HasAnswered = hasAnswered;

        await Clients.Group(TeacherGroup(room.RoomId)).AnsweredChanged(new AnsweredChanged
        {
            StudentId = student.StudentId,
            HasAnswered = hasAnswered
        });
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

                await Clients.Group(TeacherGroup(room.RoomId)).ParticipantLeft(leftMessage);

                _logger.LogInformation("Sent ParticipantLeft notification for student {StudentId} to group {TeacherGroup}",
                    student.StudentId, TeacherGroup(room.RoomId));
                break;
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private ValueTask<IEnumerable<Room>> GetAllRoomsAsync() => _roomStateManager.GetAllRoomsAsync();

    private async Task<(Room? Room, Student? Student)> GetRoomAndStudentByConnectionIdAsync(string connectionId)
    {
        foreach (var room in await GetAllRoomsAsync())
        {
            var student = room.Participants.FirstOrDefault(s => s.ConnectionId == connectionId);
            if (student != null)
            {
                return (room, student);
            }
        }

        // Preserve unknown-student handling for methods that log on invalid connections.
        var trackedStudent = await _roomStateManager.GetStudentByConnectionIdAsync(connectionId);
        return (null, trackedStudent);
    }

    private async Task SetStudentLockStateAndNotifyAsync(string roomId, Student student, bool isLocked)
    {
        student.IsLocked = isLocked;

        var message = new StudentLocked
        {
            StudentId = student.StudentId,
            IsLocked = isLocked
        };

        await Clients.Group(TeacherGroup(roomId)).StudentLocked(message);
        if (!string.IsNullOrEmpty(student.ConnectionId))
        {
            await Clients.Client(student.ConnectionId).StudentLocked(message);
        }
    }

    private static string TeacherGroup(string roomId) => $"room:{roomId}:teacher";

    private static string StudentsGroup(string roomId) => $"room:{roomId}:students";

    private static ParticipantJoined ToParticipantJoined(Student student) => new()
    {
        StudentId = student.StudentId,
        DisplayName = student.DisplayName,
        ConnectedAt = student.ConnectedAt,
        InputMode = student.InputMode,
        HasAnswered = student.HasAnswered
    };

    private static ShapeDrawn ToShapeDrawn(Shape shape) => new()
    {
        ShapeId = shape.ShapeId,
        StudentId = shape.StudentId,
        Type = shape.Type,
        Points = shape.Points,
        Color = shape.Color,
        LineWidth = shape.LineWidth,
        BackgroundType = shape.BackgroundType,
        PaperColor = shape.PaperColor,
        IsComplete = shape.IsComplete
    };
}
