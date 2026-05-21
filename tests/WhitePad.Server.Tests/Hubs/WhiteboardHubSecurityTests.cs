using Microsoft.AspNetCore.SignalR;
using WhitePad.Server.Hubs;
using WhitePad.Server.Models;
using WhitePad.Server.Models.Messages;

namespace WhitePad.Server.Tests.Hubs;

// Tier 1: the security-critical behaviours. A regression in any of these
// silently re-opens a hole flagged in the security review.
public class WhiteboardHubSecurityTests
{
    // ---------- Authorization gate on teacher-only methods ----------

    [Fact]
    public async Task KickStudent_FromNonTeacherConnection_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        // An attacker who is not the active teacher session tries to kick.
        var attacker = harness.CreateHub("attacker-conn");
        await attacker.KickStudent(room.RoomId, student.StudentId);

        Assert.Contains(room.Participants, s => s.StudentId == student.StudentId);
        Assert.DoesNotContain(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.Kicked));
        Assert.DoesNotContain(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.ParticipantLeft));
    }

    [Fact]
    public async Task KickStudent_FromTeacherConnection_RemovesAndNotifies()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var teacher = harness.CreateHub("teacher-conn");
        await teacher.KickStudent(room.RoomId, student.StudentId);

        Assert.DoesNotContain(room.Participants, s => s.StudentId == student.StudentId);
        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == "Client:student-conn" && i.Method == nameof(IWhiteboardClient.Kicked));
        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == $"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}"
                 && i.Method == nameof(IWhiteboardClient.ParticipantLeft));
    }

    [Fact]
    public async Task ClearAllBoards_FromRealStudentConnection_DoesNotBroadcast()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");
        await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        // Even a legitimately-joined student must not be able to drive teacher actions.
        var student = harness.CreateHub("student-conn");
        await student.ClearAllBoards(room.RoomId);

        Assert.DoesNotContain(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.BoardCleared));
    }

    [Fact]
    public async Task ClearAllBoards_FromTeacherConnection_Broadcasts()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");
        await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var teacher = harness.CreateHub("teacher-conn");
        await teacher.ClearAllBoards(room.RoomId);

        Assert.Contains(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.BoardCleared));
    }

    [Fact]
    public async Task SetQuestion_FromNonTeacherConnection_DoesNotSetQuestion()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        await harness.State.UpdateTeacherSessionAsync(room.RoomId, "teacher-conn");

        var attacker = harness.CreateHub("attacker-conn");
        await attacker.SetQuestion(room.RoomId, "What is 2 + 2?");

        Assert.Null(room.CurrentQuestion);
        Assert.DoesNotContain(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.QuestionChanged));
    }

    [Fact]
    public async Task TeacherAction_OnNonExistentRoom_IsNoOp()
    {
        var harness = new WhiteboardHubHarness();
        var hub = harness.CreateHub("teacher-conn");

        await hub.ClearAllBoards("does-not-exist");

        Assert.Empty(harness.Clients.Invocations);
    }

    // ---------- JoinRoomAsTeacher token enforcement ----------

    [Fact]
    public async Task JoinRoomAsTeacher_WithValidToken_SetsSessionAndJoinsGroup()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();

        var hub = harness.CreateHub("teacher-conn");
        await hub.JoinRoomAsTeacher(room.RoomId, room.TeacherToken);

        Assert.Equal("teacher-conn", room.TeacherSessionId);
        Assert.Contains(harness.Groups.Added,
            g => g.ConnectionId == "teacher-conn" && g.GroupName == WhiteboardHubHarness.TeacherGroup(room.RoomId));
    }

    [Fact]
    public async Task JoinRoomAsTeacher_WithMissingToken_ThrowsAndDoesNotSetSession()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();

        var hub = harness.CreateHub("attacker-conn");

        await Assert.ThrowsAsync<HubException>(() => hub.JoinRoomAsTeacher(room.RoomId, null));
        Assert.Null(room.TeacherSessionId);
        Assert.DoesNotContain(harness.Groups.Added, g => g.ConnectionId == "attacker-conn");
    }

    [Fact]
    public async Task JoinRoomAsTeacher_WithWrongToken_ThrowsAndDoesNotSetSession()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();

        var hub = harness.CreateHub("attacker-conn");

        await Assert.ThrowsAsync<HubException>(() => hub.JoinRoomAsTeacher(room.RoomId, "not-the-real-token"));
        Assert.Null(room.TeacherSessionId);
    }

    [Fact]
    public async Task JoinRoomAsTeacher_WithStudentJoinToken_IsRejected()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();

        // The student-facing join token must never grant the teacher role.
        var hub = harness.CreateHub("attacker-conn");

        await Assert.ThrowsAsync<HubException>(() => hub.JoinRoomAsTeacher(room.RoomId, room.JoinToken));
        Assert.Null(room.TeacherSessionId);
    }

    [Fact]
    public async Task JoinRoomAsTeacher_NonExistentRoom_ThrowsRoomNotFound()
    {
        var harness = new WhiteboardHubHarness();
        var hub = harness.CreateHub("teacher-conn");

        var ex = await Assert.ThrowsAsync<HubException>(
            () => hub.JoinRoomAsTeacher("no-such-room", "any-token"));
        Assert.Contains("Room not found", ex.Message);
    }

    [Fact]
    public async Task JoinRoomAsTeacher_SendsExistingParticipantsAndUnlocksThem()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");
        student.IsLocked = true;

        var hub = harness.CreateHub("teacher-conn");
        await hub.JoinRoomAsTeacher(room.RoomId, room.TeacherToken);

        Assert.Contains(harness.Clients.Invocations,
            i => i.Target == "Caller" && i.Method == nameof(IWhiteboardClient.ParticipantJoined));
        Assert.False(student.IsLocked);
    }

    // ---------- Anti-spoofing: server overwrites client-supplied StudentId ----------

    [Fact]
    public async Task SendStrokeBatch_OverwritesClientSuppliedStudentId()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("student-conn");
        var batch = new StrokeBatch
        {
            StudentId = "SPOOFED-ID",
            StrokeId = "stroke-1",
            Color = "#000000",
            LineWidth = 2,
            Points = new List<StrokePoint> { new() { X = 0.1, Y = 0.1 } }
        };

        await hub.SendStrokeBatch(batch);

        Assert.Equal(student.StudentId, batch.StudentId);

        var inv = Assert.Single(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.ReceiveStrokeBatch));
        Assert.Equal($"Group:{WhiteboardHubHarness.TeacherGroup(room.RoomId)}", inv.Target);
        Assert.Equal(student.StudentId, ((StrokeBatch)inv.Payload!).StudentId);
    }

    [Fact]
    public async Task SendStrokeBatch_FromUnknownConnection_DoesNotBroadcast()
    {
        var harness = new WhiteboardHubHarness();
        await harness.State.CreateRoomAsync();

        var ghost = harness.CreateHub("ghost-conn");
        await ghost.SendStrokeBatch(new StrokeBatch { StrokeId = "x", Points = new List<StrokePoint>() });

        Assert.Empty(harness.Clients.Invocations);
    }

    [Fact]
    public async Task SendShape_OverwritesClientSuppliedStudentId()
    {
        var harness = new WhiteboardHubHarness();
        var room = await harness.State.CreateRoomAsync();
        var student = await harness.State.AddStudentAsync(room.RoomId, "student-conn");

        var hub = harness.CreateHub("student-conn");
        var shape = new Shape
        {
            ShapeId = "shape-1",
            StudentId = "SPOOFED-ID",
            Type = "rectangle",
            Color = "#FF0000",
            LineWidth = 3,
            Points = new List<StrokePoint> { new() { X = 0.1, Y = 0.1 }, new() { X = 0.5, Y = 0.5 } }
        };

        await hub.SendShape(shape);

        Assert.Equal(student.StudentId, shape.StudentId);

        var inv = Assert.Single(harness.Clients.Invocations, i => i.Method == nameof(IWhiteboardClient.ReceiveShape));
        Assert.Equal(student.StudentId, ((ShapeDrawn)inv.Payload!).StudentId);
    }

    [Fact]
    public async Task SendShape_FromUnknownConnection_DoesNotBroadcast()
    {
        var harness = new WhiteboardHubHarness();
        await harness.State.CreateRoomAsync();

        var ghost = harness.CreateHub("ghost-conn");
        await ghost.SendShape(new Shape { ShapeId = "x", Points = new List<StrokePoint>() });

        Assert.Empty(harness.Clients.Invocations);
    }
}
