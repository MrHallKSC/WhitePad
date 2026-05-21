using WhitePad.Server.Hubs;
using WhitePad.Server.Models;
using WhitePad.Server.Models.Messages;

namespace WhitePad.Server.Tests.Hubs;

// Tier 2: core logic — join validation, eraser detection, question handling,
// confidence validation.
public class WhiteboardHubCoreTests
{
    // ---------- JoinRoomAsStudent ----------

    [Fact]
    public async Task JoinRoomAsStudent_RoomNotFound_ReturnsFailure()
    {
        var harness = new WhiteboardHubHarness();
        var hub = harness.CreateHub("student-conn");

        var response = await hub.JoinRoomAsStudent("no-such-room", "JOINTOK1", "Alice");

        Assert.False(response.Success);
        Assert.Equal("Room not found", response.Error);
    }

    [Fact]
    public async Task JoinRoomAsStudent_InvalidToken_ReturnsFailure()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var hub = harness.CreateHub("student-conn");

        var response = await hub.JoinRoomAsStudent(room.RoomId, "WRONG-TOKEN", "Alice");

        Assert.False(response.Success);
        Assert.Contains("Invalid", response.Error);
        Assert.Empty(room.Participants);
    }

    [Fact]
    public async Task JoinRoomAsStudent_RoomFull_ReturnsFailure()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        room.Settings.MaxStudents = 1;
        await harness.State.AddStudentAsync(room.RoomId, "existing-conn");

        var hub = harness.CreateHub("newcomer-conn");
        var response = await hub.JoinRoomAsStudent(room.RoomId, harness.Tokens.JoinToken, "Bob");

        Assert.False(response.Success);
        Assert.Contains("full", response.Error);
        Assert.Single(room.Participants);
    }

    [Fact]
    public async Task JoinRoomAsStudent_HappyPath_AddsStudentAndNotifiesTeacher()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        room.CurrentQuestion = "What is 7 x 8?";

        var hub = harness.CreateHub("student-conn");
        var response = await hub.JoinRoomAsStudent(room.RoomId, harness.Tokens.JoinToken, "Alice");

        Assert.True(response.Success);
        Assert.Equal("Alice", response.DisplayName);
        Assert.NotNull(response.StudentId);
        Assert.Equal("What is 7 x 8?", response.CurrentQuestion);

        Assert.Contains(room.Participants, s => s.ConnectionId == "student-conn");
        Assert.Contains(harness.Groups.Added,
            g => g.ConnectionId == "student-conn" && g.GroupName == WhiteboardHubHarness.StudentsGroup(room.RoomId));
        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == $"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}"
                 && i.Method == nameof(IWhiteboardClient.ParticipantJoined));
    }

    // ---------- SendStrokeBatch eraser detection ----------

    [Fact]
    public async Task SendStrokeBatch_PlainStroke_IsNotEraser()
    {
        var batch = await SendStroke(new StrokeBatch
        {
            StrokeId = "stroke-1",
            Color = "#000000",
            LineWidth = 2,
            Points = new List<StrokePoint> { new() { X = 0.1, Y = 0.1 } }
        });

        Assert.False(batch.IsEraser);
    }

    [Fact]
    public async Task SendStrokeBatch_StrokeIdMarker_FlagsEraser()
    {
        var batch = await SendStroke(new StrokeBatch
        {
            StrokeId = "stroke-eraser-1",
            Color = "#000000",
            LineWidth = 2,
            Points = new List<StrokePoint> { new() { X = 0.1, Y = 0.1 } }
        });

        Assert.True(batch.IsEraser);
    }

    [Fact]
    public async Task SendStrokeBatch_ColorSentinel_FlagsEraser()
    {
        var batch = await SendStroke(new StrokeBatch
        {
            StrokeId = "stroke-1",
            Color = "__WHITEPAD_ERASER__",
            LineWidth = 2,
            Points = new List<StrokePoint> { new() { X = 0.1, Y = 0.1 } }
        });

        Assert.True(batch.IsEraser);
    }

    [Fact]
    public async Task SendStrokeBatch_NegativeLineWidth_FlagsEraser()
    {
        var batch = await SendStroke(new StrokeBatch
        {
            StrokeId = "stroke-1",
            Color = "#000000",
            LineWidth = -1,
            Points = new List<StrokePoint> { new() { X = 0.1, Y = 0.1 } }
        });

        Assert.True(batch.IsEraser);
    }

    [Fact]
    public async Task SendStrokeBatch_AlreadyMarkedEraser_StaysEraser()
    {
        var batch = await SendStroke(new StrokeBatch
        {
            StrokeId = "stroke-1",
            Color = "#000000",
            LineWidth = 2,
            IsEraser = true,
            Points = new List<StrokePoint> { new() { X = 0.1, Y = 0.1 } }
        });

        Assert.True(batch.IsEraser);
    }

    private static async Task<StrokeBatch> SendStroke(StrokeBatch batch)
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("student-conn");
        await hub.SendStrokeBatch(batch);
        return batch;
    }

    // ---------- SetQuestion ----------

    [Fact]
    public async Task SetQuestion_NewSignature_SetsQuestionAndBroadcasts()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");
        student.HasAnswered = true;

        var hub = harness.CreateHub("teacher-conn");
        await hub.SetQuestion(room.RoomId, "What is the capital of France?");

        Assert.Equal("What is the capital of France?", room.CurrentQuestion);
        Assert.False(student.HasAnswered);
        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == $"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}"
                 && i.Method == nameof(IWhiteboardClient.QuestionChanged));
        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == $"Group:{WhiteboardHubHarness.StudentsGroup(room.RoomId)}"
                 && i.Method == nameof(IWhiteboardClient.QuestionChanged));
    }

    [Fact]
    public async Task SetQuestion_LongQuestion_IsTruncatedTo280Chars()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");

        var hub = harness.CreateHub("teacher-conn");
        await hub.SetQuestion(room.RoomId, new string('x', 300));

        Assert.NotNull(room.CurrentQuestion);
        Assert.Equal(280, room.CurrentQuestion!.Length);
    }

    [Fact]
    public async Task SetQuestion_WhitespaceQuestion_ClearsToNull()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        room.CurrentQuestion = "previous question";
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");

        var hub = harness.CreateHub("teacher-conn");
        await hub.SetQuestion(room.RoomId, "   ");

        Assert.Null(room.CurrentQuestion);
    }

    [Fact]
    public async Task SetQuestion_LegacySingleArg_UsesTeacherConnectionRoom()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");

        // First arg is not a known roomId, so the hub falls back to resolving
        // the room from the teacher's connection.
        var hub = harness.CreateHub("teacher-conn");
        await hub.SetQuestion("Just a question, no room id");

        Assert.Equal("Just a question, no room id", room.CurrentQuestion);
    }

    // ---------- SetConfidence ----------

    [Fact]
    public async Task SetConfidence_InvalidLevel_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("student-conn");
        await hub.SetConfidence("purple");

        Assert.Equal("none", student.ConfidenceLevel);
        Assert.DoesNotContain(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.ConfidenceChanged));
    }

    [Theory]
    [InlineData("red")]
    [InlineData("amber")]
    [InlineData("green")]
    [InlineData("none")]
    public async Task SetConfidence_ValidLevel_UpdatesAndBroadcasts(string level)
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("student-conn");
        await hub.SetConfidence(level);

        Assert.Equal(level, student.ConfidenceLevel);
        var inv = Assert.Single(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.ConfidenceChanged));
        Assert.Equal($"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}", inv.Target);
        Assert.Equal(level, ((ConfidenceChanged)inv.Payload!).ConfidenceLevel);
    }

    [Fact]
    public async Task SetConfidence_UnknownConnection_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        await harness.State.CreateRoomAsync();

        var ghost = harness.CreateHub("ghost-conn");
        await ghost.SetConfidence("green");

        Assert.Empty(harness.Clients.Invocations);
    }
}
