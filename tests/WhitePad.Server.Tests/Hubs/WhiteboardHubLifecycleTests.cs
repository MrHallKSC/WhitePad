using WhitePad.Server.Hubs;
using WhitePad.Server.Models;
using WhitePad.Server.Models.Messages;

namespace WhitePad.Server.Tests.Hubs;

// Tier 3: behavioural completeness — student self-service actions, teacher
// per-student actions, and disconnect handling.
public class WhiteboardHubLifecycleTests
{
    // ---------- Student self-service: UndoStroke / ClearBoard / SetAnswered ----------

    [Fact]
    public async Task UndoStroke_HappyPath_BroadcastsWithStudentOwnId()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("student-conn");
        await hub.UndoStroke("stroke-9");

        var inv = Assert.Single(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.StrokeUndone));
        Assert.Equal($"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}", inv.Target);
        var message = (StrokeUndone)inv.Payload!;
        Assert.Equal(student.StudentId, message.StudentId);
        Assert.Equal("stroke-9", message.StrokeId);
    }

    [Fact]
    public async Task UndoStroke_UnknownConnection_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        await harness.State.CreateRoomAsync();

        var ghost = harness.CreateHub("ghost-conn");
        await ghost.UndoStroke("stroke-9");

        Assert.Empty(harness.Clients.Invocations);
    }

    [Fact]
    public async Task ClearBoard_HappyPath_BroadcastsWithStudentOwnId()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("student-conn");
        await hub.ClearBoard();

        var inv = Assert.Single(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.BoardCleared));
        Assert.Equal($"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}", inv.Target);
        Assert.Equal(student.StudentId, ((BoardCleared)inv.Payload!).StudentId);
    }

    [Fact]
    public async Task ClearBoard_UnknownConnection_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        await harness.State.CreateRoomAsync();

        var ghost = harness.CreateHub("ghost-conn");
        await ghost.ClearBoard();

        Assert.Empty(harness.Clients.Invocations);
    }

    [Fact]
    public async Task SetAnswered_HappyPath_UpdatesStateAndBroadcasts()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("student-conn");
        await hub.SetAnswered(true);

        Assert.True(student.HasAnswered);
        var inv = Assert.Single(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.AnsweredChanged));
        Assert.Equal($"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}", inv.Target);
        var message = (AnsweredChanged)inv.Payload!;
        Assert.Equal(student.StudentId, message.StudentId);
        Assert.True(message.HasAnswered);
    }

    [Fact]
    public async Task SetAnswered_UnknownConnection_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        await harness.State.CreateRoomAsync();

        var ghost = harness.CreateHub("ghost-conn");
        await ghost.SetAnswered(true);

        Assert.Empty(harness.Clients.Invocations);
    }

    // ---------- Teacher per-student actions: Lock / Unlock / ClearStudentBoard ----------

    [Fact]
    public async Task LockStudent_FromTeacher_SetsLockAndNotifiesBothSides()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("teacher-conn");
        await hub.LockStudent(room.RoomId, student.StudentId);

        Assert.True(student.IsLocked);
        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == $"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}"
                 && i.Method == nameof(IWhiteboardClient.StudentLocked));
        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == "Client:student-conn" && i.Method == nameof(IWhiteboardClient.StudentLocked));
    }

    [Fact]
    public async Task UnlockStudent_FromTeacher_ClearsLock()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");
        student.IsLocked = true;

        var hub = harness.CreateHub("teacher-conn");
        await hub.UnlockStudent(room.RoomId, student.StudentId);

        Assert.False(student.IsLocked);
    }

    [Fact]
    public async Task LockStudent_StudentNotFound_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");

        var hub = harness.CreateHub("teacher-conn");
        await hub.LockStudent(room.RoomId, "no-such-student");

        Assert.DoesNotContain(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.StudentLocked));
    }

    [Fact]
    public async Task ClearStudentBoard_FromTeacher_NotifiesStudentAndTeacher()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("teacher-conn");
        await hub.ClearStudentBoard(room.RoomId, student.StudentId);

        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == "Client:student-conn" && i.Method == nameof(IWhiteboardClient.BoardCleared));
        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == $"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}"
                 && i.Method == nameof(IWhiteboardClient.BoardCleared));
    }

    [Fact]
    public async Task KickStudent_StudentNotFound_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");

        var hub = harness.CreateHub("teacher-conn");
        await hub.KickStudent(room.RoomId, "no-such-student");

        Assert.DoesNotContain(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.Kicked));
        Assert.DoesNotContain(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.ParticipantLeft));
    }

    // ---------- OnDisconnectedAsync ----------

    [Fact]
    public async Task OnDisconnectedAsync_StudentConnection_RemovesAndNotifiesTeacher()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("student-conn");
        await hub.OnDisconnectedAsync(null);

        Assert.DoesNotContain(room.Participants, s => s.StudentId == student.StudentId);
        var inv = Assert.Single(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.ParticipantLeft));
        Assert.Equal($"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}", inv.Target);
        var message = (ParticipantLeft)inv.Payload!;
        Assert.Equal(student.StudentId, message.StudentId);
        Assert.Equal("disconnect", message.Reason);
    }

    [Fact]
    public async Task OnDisconnectedAsync_NonStudentConnection_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        // A teacher (or any non-student) connection disconnecting must not
        // remove participants or broadcast.
        var hub = harness.CreateHub("teacher-conn");
        await hub.OnDisconnectedAsync(null);

        Assert.Single(room.Participants);
        Assert.DoesNotContain(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.ParticipantLeft));
    }
}
