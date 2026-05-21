using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using WhitePad.Server.Hubs;
using WhitePad.Server.Models;
using WhitePad.Server.Models.Messages;
using WhitePad.Server.Services;

namespace WhitePad.Server.Tests.Services;

public class RoomExpirationServiceTests
{
    private sealed class FakeTokenGenerator : ITokenGenerator
    {
        private int _counter;
        public string GenerateRoomId() => $"room-{++_counter}";
        public string GenerateJoinToken() => "JOINTOKEN";
        public string GenerateTeacherToken() => "teacher-token";
    }

    private static RoomExpirationService CreateService(
        IRoomStateManager manager,
        RecordingHubContext hubContext,
        double expirationHours = 12.0)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Room:ExpirationHours"] = expirationHours.ToString()
            })
            .Build();

        return new RoomExpirationService(
            manager,
            hubContext,
            config,
            NullLogger<RoomExpirationService>.Instance);
    }

    [Fact]
    public async Task SweepAsync_RemovesRoomsPastTtl()
    {
        var manager = new InMemoryRoomStateManager(new FakeTokenGenerator());
        var staleRoom = await manager.CreateRoomAsync();
        staleRoom.LastActivityAt = DateTime.UtcNow.AddHours(-13); // older than 12h TTL

        var hubContext = new RecordingHubContext();
        var service = CreateService(manager, hubContext);

        await service.SweepAsync();

        Assert.Null(await manager.GetRoomAsync(staleRoom.RoomId));
    }

    [Fact]
    public async Task SweepAsync_KeepsActiveRooms()
    {
        var manager = new InMemoryRoomStateManager(new FakeTokenGenerator());
        var activeRoom = await manager.CreateRoomAsync();
        activeRoom.LastActivityAt = DateTime.UtcNow.AddMinutes(-5); // well inside TTL

        var hubContext = new RecordingHubContext();
        var service = CreateService(manager, hubContext);

        await service.SweepAsync();

        Assert.NotNull(await manager.GetRoomAsync(activeRoom.RoomId));
    }

    [Fact]
    public async Task SweepAsync_NotifiesParticipantsOfExpiredRoom()
    {
        var manager = new InMemoryRoomStateManager(new FakeTokenGenerator());
        var staleRoom = await manager.CreateRoomAsync();
        await manager.AddStudentAsync(staleRoom.RoomId, "conn-A");
        await manager.AddStudentAsync(staleRoom.RoomId, "conn-B");
        staleRoom.LastActivityAt = DateTime.UtcNow.AddHours(-13);

        var hubContext = new RecordingHubContext();
        var service = CreateService(manager, hubContext);

        await service.SweepAsync();

        Assert.Contains("conn-A", hubContext.KickedConnectionIds);
        Assert.Contains("conn-B", hubContext.KickedConnectionIds);
    }

    [Fact]
    public async Task SweepAsync_DoesNotNotifyParticipantsOfActiveRoom()
    {
        var manager = new InMemoryRoomStateManager(new FakeTokenGenerator());
        var activeRoom = await manager.CreateRoomAsync();
        await manager.AddStudentAsync(activeRoom.RoomId, "conn-active");
        activeRoom.LastActivityAt = DateTime.UtcNow;

        var hubContext = new RecordingHubContext();
        var service = CreateService(manager, hubContext);

        await service.SweepAsync();

        Assert.Empty(hubContext.KickedConnectionIds);
    }

    [Fact]
    public async Task SweepAsync_ExpiresOnlyStaleRoomsInMixedSet()
    {
        var manager = new InMemoryRoomStateManager(new FakeTokenGenerator());
        var stale = await manager.CreateRoomAsync();
        stale.LastActivityAt = DateTime.UtcNow.AddHours(-13);
        var active = await manager.CreateRoomAsync();
        active.LastActivityAt = DateTime.UtcNow;

        var hubContext = new RecordingHubContext();
        var service = CreateService(manager, hubContext);

        await service.SweepAsync();

        Assert.Null(await manager.GetRoomAsync(stale.RoomId));
        Assert.NotNull(await manager.GetRoomAsync(active.RoomId));
    }

    // --- Hand-rolled IHubContext that records which connections received Kicked() ---

    private sealed class RecordingHubContext : IHubContext<WhiteboardHub, IWhiteboardClient>
    {
        public List<string> KickedConnectionIds { get; } = new();

        public IHubClients<IWhiteboardClient> Clients { get; }
        public IGroupManager Groups { get; } = new NoOpGroupManager();

        public RecordingHubContext()
        {
            Clients = new RecordingHubClients(this);
        }

        private sealed class RecordingHubClients : IHubClients<IWhiteboardClient>
        {
            private readonly RecordingHubContext _owner;
            public RecordingHubClients(RecordingHubContext owner) => _owner = owner;

            public IWhiteboardClient Client(string connectionId) =>
                new RecordingClient(_owner, connectionId);

            public IWhiteboardClient All => new RecordingClient(_owner, null);
            public IWhiteboardClient AllExcept(IReadOnlyList<string> excludedConnectionIds) => All;
            public IWhiteboardClient Clients(IReadOnlyList<string> connectionIds) => All;
            public IWhiteboardClient Group(string groupName) => All;
            public IWhiteboardClient Groups(IReadOnlyList<string> groupNames) => All;
            public IWhiteboardClient GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => All;
            public IWhiteboardClient User(string userId) => All;
            public IWhiteboardClient Users(IReadOnlyList<string> userIds) => All;
        }

        private sealed class RecordingClient : IWhiteboardClient
        {
            private readonly RecordingHubContext _owner;
            private readonly string? _connectionId;

            public RecordingClient(RecordingHubContext owner, string? connectionId)
            {
                _owner = owner;
                _connectionId = connectionId;
            }

            public Task Kicked()
            {
                if (_connectionId != null)
                {
                    _owner.KickedConnectionIds.Add(_connectionId);
                }
                return Task.CompletedTask;
            }

            public Task ParticipantJoined(ParticipantJoined participant) => Task.CompletedTask;
            public Task ParticipantLeft(ParticipantLeft info) => Task.CompletedTask;
            public Task ReceiveStrokeBatch(StrokeBatch batch) => Task.CompletedTask;
            public Task ReceiveShape(ShapeDrawn shape) => Task.CompletedTask;
            public Task ConfidenceChanged(ConfidenceChanged message) => Task.CompletedTask;
            public Task StrokeUndone(StrokeUndone message) => Task.CompletedTask;
            public Task BoardCleared(BoardCleared message) => Task.CompletedTask;
            public Task StudentLocked(StudentLocked message) => Task.CompletedTask;
            public Task WaitingRoomStateChanged(WaitingRoomStateChanged message) => Task.CompletedTask;
            public Task QuestionChanged(QuestionChanged message) => Task.CompletedTask;
            public Task AnsweredChanged(AnsweredChanged message) => Task.CompletedTask;
        }

        private sealed class NoOpGroupManager : IGroupManager
        {
            public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default) => Task.CompletedTask;
            public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default) => Task.CompletedTask;
        }
    }
}
