using Microsoft.AspNetCore.SignalR;
using WhitePad.Server.Models;
using WhitePad.Server.Models.Messages;
using WhitePad.Server.Services;

namespace WhitePad.Server.Hubs;

public class WhiteboardHub : Hub<IWhiteboardClient>
{
    private readonly IRoomStateManager _roomStateManager;
    private readonly ILogger<WhiteboardHub> _logger;
    private readonly IConfiguration _configuration;
    private const int MaxQuestionLength = 280;
    private const string EraserStrokeMarker = "-eraser-";
    private const string EraserColorSentinel = "__WHITEPAD_ERASER__";
    private static readonly TimeSpan StudentDisconnectGracePeriod = TimeSpan.FromSeconds(20);

    public WhiteboardHub(IRoomStateManager roomStateManager, ILogger<WhiteboardHub> logger, IConfiguration configuration)
    {
        _roomStateManager = roomStateManager;
        _logger = logger;
        _configuration = configuration;
    }

    // Teacher creates a room
    public async Task<CreateRoomResponse> CreateRoom(string roomName)
    {
        var room = await _roomStateManager.CreateRoomAsync();
        room.RoomName = roomName;

        _logger.LogInformation("Room created: {RoomId} - {RoomName}", room.RoomId, roomName);

        var publicHostname = _configuration["PublicHostname"];
        string joinUrl;
        if (!string.IsNullOrEmpty(publicHostname))
        {
            joinUrl = $"https://{publicHostname}/join?roomId={room.RoomId}&token={room.JoinToken}";
        }
        else
        {
            var joinHost = NetworkUtility.GetLocalIPAddress();
            joinUrl = $"https://{joinHost}:5001/join?roomId={room.RoomId}&token={room.JoinToken}";
        }

        _logger.LogInformation("Join URL generated for room {RoomId}", room.RoomId);

        return new CreateRoomResponse
        {
            RoomId = room.RoomId,
            RoomName = roomName,
            JoinToken = room.JoinToken,
            TeacherToken = room.TeacherToken,
            JoinUrl = joinUrl,
            CreatedAt = room.CreatedAt
        };
    }

    // Teacher joins room to view dashboard.
    // Requires the TeacherToken returned from CreateRoom — the student-facing
    // JoinToken is not sufficient, otherwise any student could claim the teacher
    // role and receive every participant's stroke broadcasts.
    public async Task JoinRoomAsTeacher(string roomId, string? teacherToken = null)
    {
        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Teacher tried to join non-existent room: {RoomId}", roomId);
            throw new HubException("Room not found");
        }

        if (string.IsNullOrEmpty(teacherToken) ||
            !await _roomStateManager.ValidateTeacherTokenAsync(roomId, teacherToken))
        {
            _logger.LogWarning(
                "Rejected JoinRoomAsTeacher for room {RoomId} from {ConnectionId}: invalid or missing teacher token",
                roomId, Context.ConnectionId);
            throw new HubException("Invalid teacher token");
        }

        await _roomStateManager.UpdateTeacherSessionAsync(roomId, Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, TeacherGroup(roomId));
        room.WaitingRoomEnabled = false;
        room.WaitingRoomUnlocked = true;

        _logger.LogInformation("Teacher joined room: {RoomId}", roomId);

        // Send current participants to teacher
        foreach (var student in room.Participants)
        {
            student.IsLocked = false;
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

        student.IsLocked = false;
        room.WaitingRoomEnabled = false;
        room.WaitingRoomUnlocked = true;

        // Notify teacher
        await Clients.Group(TeacherGroup(roomId)).ParticipantJoined(ToParticipantJoined(student));

        return new JoinRoomResponse
        {
            Success = true,
            StudentId = student.StudentId,
            StudentSessionToken = student.StudentSessionToken,
            DisplayName = student.DisplayName,
            RoomSettings = room.Settings,
            IsLocked = student.IsLocked,
            WaitingRoomEnabled = false,
            WaitingRoomUnlocked = true,
            CurrentQuestion = room.CurrentQuestion
        };
    }

    // Student reconnects after a browser refresh using the private session token
    // returned by JoinRoomAsStudent. This keeps the teacher tile stable.
    public async Task<JoinRoomResponse> ResumeStudentSession(string roomId, string joinToken, string studentSessionToken)
    {
        _logger.LogInformation("Student attempting to resume room: {RoomId}", roomId);

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

        var student = await _roomStateManager.ResumeStudentAsync(roomId, studentSessionToken, Context.ConnectionId);
        if (student == null)
        {
            return new JoinRoomResponse { Success = false, Error = "Student session expired" };
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, StudentsGroup(roomId));

        _logger.LogInformation("Student resumed: {StudentId} ({DisplayName}) in room {RoomId}", student.StudentId, student.DisplayName, roomId);

        await Clients.Group(TeacherGroup(roomId)).ParticipantJoined(ToParticipantJoined(student));

        return new JoinRoomResponse
        {
            Success = true,
            StudentId = student.StudentId,
            StudentSessionToken = student.StudentSessionToken,
            DisplayName = student.DisplayName,
            RoomSettings = room.Settings,
            IsLocked = student.IsLocked,
            WaitingRoomEnabled = false,
            WaitingRoomUnlocked = true,
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

        // Keep the room alive against the expiration sweep while drawing.
        room.LastActivityAt = DateTime.UtcNow;

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

        room.LastActivityAt = DateTime.UtcNow;

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

        var room = await GetAuthorizedTeacherRoomAsync(roomId);
        if (room == null) return;

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

        var room = await GetAuthorizedTeacherRoomAsync(roomId);
        if (room == null) return;

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

        var room = await GetAuthorizedTeacherRoomAsync(roomId);
        if (room == null) return;

        foreach (var student in room.Participants)
        {
            await SetStudentLockStateAndNotifyAsync(roomId, student, isLocked: true);
        }
    }

    // Teacher unlocks all students
    public async Task UnlockAllStudents(string roomId)
    {
        _logger.LogInformation("Teacher unlocking all students in room {RoomId}", roomId);

        var room = await GetAuthorizedTeacherRoomAsync(roomId);
        if (room == null) return;

        foreach (var student in room.Participants)
        {
            await SetStudentLockStateAndNotifyAsync(roomId, student, isLocked: false);
        }
    }

    // Teacher kicks a student (disconnects them, sends them back to name input)
    public async Task KickStudent(string roomId, string studentId)
    {
        _logger.LogInformation("Teacher kicking student {StudentId} from room {RoomId}", studentId, roomId);

        var room = await GetAuthorizedTeacherRoomAsync(roomId);
        if (room == null) return;

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

        var room = await GetAuthorizedTeacherRoomAsync(roomId);
        if (room == null) return;

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

        var room = await GetAuthorizedTeacherRoomAsync(roomId);
        if (room == null) return;

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

    // Legacy compatibility: waiting rooms are no longer used.
    public async Task UnlockWaitingRoom(string roomId)
    {
        _logger.LogInformation("Ignoring legacy waiting room unlock in room {RoomId}", roomId);

        var room = await GetAuthorizedTeacherRoomAsync(roomId);
        if (room == null) return;

        room.WaitingRoomEnabled = false;
        room.WaitingRoomUnlocked = true;
        var message = new WaitingRoomStateChanged
        {
            WaitingRoomEnabled = false,
            WaitingRoomUnlocked = true
        };

        await Clients.Group(StudentsGroup(roomId)).WaitingRoomStateChanged(message);
    }

    // Legacy compatibility: waiting rooms are no longer used.
    public async Task SetWaitingRoomEnabled(string roomId, bool enabled)
    {
        _logger.LogInformation("Ignoring legacy waiting room enabled={Enabled} in room {RoomId}", enabled, roomId);

        var room = await GetAuthorizedTeacherRoomAsync(roomId);
        if (room == null) return;

        room.WaitingRoomEnabled = false;
        room.WaitingRoomUnlocked = true;

        foreach (var student in room.Participants.Where(student => student.IsLocked))
        {
            await SetStudentLockStateAndNotifyAsync(roomId, student, isLocked: false);
        }

        var message = new WaitingRoomStateChanged
        {
            WaitingRoomEnabled = false,
            WaitingRoomUnlocked = true
        };

        await Clients.Group(StudentsGroup(roomId)).WaitingRoomStateChanged(message);
    }

    // Legacy compatibility: students now join the canvas immediately.
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

        room.WaitingRoomEnabled = false;
        room.WaitingRoomUnlocked = true;

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

        if (!IsAuthorizedTeacher(room))
        {
            _logger.LogWarning(
                "Rejected SetQuestion in room {RoomId} from {ConnectionId}: not the active teacher session",
                roomId, Context.ConnectionId);
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

        var (room, student) = await _roomStateManager.MarkStudentDisconnectedAsync(Context.ConnectionId);
        if (room == null || student == null)
        {
            _logger.LogInformation("No student found for connection {ConnectionId}, might be teacher", Context.ConnectionId);
            await base.OnDisconnectedAsync(exception);
            return;
        }

        _logger.LogInformation("Found student {StudentId} ({DisplayName}) for disconnection", student.StudentId, student.DisplayName);

        _ = RemoveDisconnectedStudentAfterGraceAsync(room.RoomId, student.StudentId, Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }

    private async Task RemoveDisconnectedStudentAfterGraceAsync(string roomId, string studentId, string disconnectedConnectionId)
    {
        try
        {
            await Task.Delay(StudentDisconnectGracePeriod);

            var removed = await _roomStateManager.RemoveStudentIfStillDisconnectedAsync(roomId, studentId, disconnectedConnectionId);
            if (!removed) return;

            var leftMessage = new ParticipantLeft
            {
                StudentId = studentId,
                Reason = "disconnect",
                LeftAt = DateTime.UtcNow
            };

            await Clients.Group(TeacherGroup(roomId)).ParticipantLeft(leftMessage);

            _logger.LogInformation("Removed disconnected student {StudentId} from room {RoomId} after grace period", studentId, roomId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove disconnected student {StudentId} from room {RoomId}", studentId, roomId);
        }
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

    // Returns the room only if the current connection is the active teacher
    // session for that room. Centralises the authorization gate used by every
    // teacher-only hub method; logs a warning on mismatch so abuse is visible.
    private async Task<Room?> GetAuthorizedTeacherRoomAsync(string roomId)
    {
        var room = await _roomStateManager.GetRoomAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return null;
        }

        if (!IsAuthorizedTeacher(room))
        {
            _logger.LogWarning(
                "Rejected teacher action in room {RoomId} from {ConnectionId}: not the active teacher session",
                roomId, Context.ConnectionId);
            return null;
        }

        return room;
    }

    private bool IsAuthorizedTeacher(Room room) =>
        !string.IsNullOrEmpty(room.TeacherSessionId) &&
        room.TeacherSessionId == Context.ConnectionId;

    private static ParticipantJoined ToParticipantJoined(Student student) => new()
    {
        StudentId = student.StudentId,
        DisplayName = student.DisplayName,
        ConnectedAt = student.ConnectedAt,
        InputMode = student.InputMode,
        HasAnswered = student.HasAnswered,
        ConfidenceLevel = student.ConfidenceLevel,
        IsLocked = student.IsLocked
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
