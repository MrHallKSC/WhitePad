using WhitePad.Server.Models;
using WhitePad.Server.Services;

namespace WhitePad.Server.Tests.Services;

public class InMemoryRoomStateManagerTests
{
    private sealed class FakeTokenGenerator : ITokenGenerator
    {
        public string RoomId { get; set; } = "room-1";
        public string JoinToken { get; set; } = "TOKEN1";

        public string GenerateRoomId() => RoomId;

        public string GenerateJoinToken() => JoinToken;
    }

    [Fact]
    public async Task CreateRoomAsync_UsesTokenGeneratorValues()
    {
        var tokens = new FakeTokenGenerator { RoomId = "room-xyz", JoinToken = "join-abc" };
        var manager = new InMemoryRoomStateManager(tokens);
        var before = DateTime.UtcNow;

        var room = await manager.CreateRoomAsync();
        var after = DateTime.UtcNow;

        Assert.Equal("room-xyz", room.RoomId);
        Assert.Equal("join-abc", room.JoinToken);
        Assert.InRange(room.CreatedAt, before, after);
        Assert.InRange(room.LastActivityAt, before, after);
    }

    [Fact]
    public async Task ValidateJoinTokenAsync_ReturnsTrueForMatch()
    {
        var tokens = new FakeTokenGenerator { RoomId = "room-1", JoinToken = "TOKEN1" };
        var manager = new InMemoryRoomStateManager(tokens);
        await manager.CreateRoomAsync();

        var valid = await manager.ValidateJoinTokenAsync("room-1", "TOKEN1");
        var invalid = await manager.ValidateJoinTokenAsync("room-1", "WRONG");
        var missing = await manager.ValidateJoinTokenAsync("missing", "TOKEN1");

        Assert.True(valid);
        Assert.False(invalid);
        Assert.False(missing);
    }

    [Fact]
    public async Task AddStudentAsync_AssignsDefaultNameAndIncrementsCounter()
    {
        var tokens = new FakeTokenGenerator { RoomId = "room-1", JoinToken = "TOKEN1" };
        var manager = new InMemoryRoomStateManager(tokens);
        var room = await manager.CreateRoomAsync();

        var before = room.LastActivityAt;
        var student1 = await manager.AddStudentAsync(room.RoomId, "conn-1", "  ");
        var student2 = await manager.AddStudentAsync(room.RoomId, "conn-2");

        Assert.Equal("Student 1", student1.DisplayName);
        Assert.Equal("Student 2", student2.DisplayName);
        Assert.Equal(2, room.StudentCounter);
        Assert.NotEqual(before, room.LastActivityAt);
        Assert.Contains(room.Participants, s => s.StudentId == student1.StudentId);
        Assert.Contains(room.Participants, s => s.StudentId == student2.StudentId);
    }

    [Fact]
    public async Task AddStudentAsync_TrimsProvidedName()
    {
        var tokens = new FakeTokenGenerator { RoomId = "room-1", JoinToken = "TOKEN1" };
        var manager = new InMemoryRoomStateManager(tokens);
        var room = await manager.CreateRoomAsync();

        var student = await manager.AddStudentAsync(room.RoomId, "conn-1", "  Alice  ");

        Assert.Equal("Alice", student.DisplayName);
    }

    [Fact]
    public async Task RemoveStudentAsync_RemovesStudentAndUpdatesLastActivity()
    {
        var tokens = new FakeTokenGenerator { RoomId = "room-1", JoinToken = "TOKEN1" };
        var manager = new InMemoryRoomStateManager(tokens);
        var room = await manager.CreateRoomAsync();
        var student = await manager.AddStudentAsync(room.RoomId, "conn-1");

        var before = room.LastActivityAt;
        await manager.RemoveStudentAsync(room.RoomId, student.StudentId);

        Assert.DoesNotContain(room.Participants, s => s.StudentId == student.StudentId);
        Assert.True(room.LastActivityAt >= before);
    }

    [Fact]
    public async Task GetStudentByConnectionIdAsync_FindsStudentAcrossRooms()
    {
        var tokens = new FakeTokenGenerator { RoomId = "room-1", JoinToken = "TOKEN1" };
        var manager = new InMemoryRoomStateManager(tokens);
        var room1 = await manager.CreateRoomAsync();
        await manager.AddStudentAsync(room1.RoomId, "conn-1");

        tokens.RoomId = "room-2";
        tokens.JoinToken = "TOKEN2";
        var room2 = await manager.CreateRoomAsync();
        var student2 = await manager.AddStudentAsync(room2.RoomId, "conn-2");

        var found = await manager.GetStudentByConnectionIdAsync("conn-2");

        Assert.NotNull(found);
        Assert.Equal(student2.StudentId, found!.StudentId);
    }

    [Fact]
    public async Task UpdateTeacherSessionAsync_SetsSessionIdAndUpdatesLastActivity()
    {
        var tokens = new FakeTokenGenerator { RoomId = "room-1", JoinToken = "TOKEN1" };
        var manager = new InMemoryRoomStateManager(tokens);
        var room = await manager.CreateRoomAsync();

        var before = room.LastActivityAt;
        await manager.UpdateTeacherSessionAsync(room.RoomId, "teacher-1");

        Assert.Equal("teacher-1", room.TeacherSessionId);
        Assert.True(room.LastActivityAt >= before);
    }
}
