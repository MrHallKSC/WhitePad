using System.Security.Claims;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using WhitePad.Server.Hubs;
using WhitePad.Server.Models;
using WhitePad.Server.Models.Messages;
using WhitePad.Server.Services;

namespace WhitePad.Server.Tests.Hubs;

// A single record of one outbound hub->client invocation: which target it was
// sent to, which client method, and the payload object.
internal sealed record HubInvocation(string Target, string Method, object? Payload);

// Drives WhiteboardHub directly (no SignalR server). State and the recording
// transport are shared across all hub instances the harness creates, so a
// student hub's broadcasts are visible when asserting from the test, exactly
// like the real shared hub infrastructure.
internal sealed class WhiteboardHubHarness
{
    public FakeTokenGenerator Tokens { get; } = new();
    public InMemoryRoomStateManager State { get; }
    public RecordingHubCallerClients Clients { get; } = new();
    public RecordingGroupManager Groups { get; } = new();
    public IConfiguration Configuration { get; }

    public WhiteboardHubHarness(IDictionary<string, string?>? config = null)
    {
        State = new InMemoryRoomStateManager(Tokens);
        Configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(config ?? new Dictionary<string, string?>())
            .Build();
    }

    public WhiteboardHub CreateHub(string connectionId)
    {
        var hub = new WhiteboardHub(State, NullLogger<WhiteboardHub>.Instance, Configuration)
        {
            Clients = Clients,
            Groups = Groups,
            Context = new FakeHubCallerContext(connectionId),
        };
        return hub;
    }

    public static string TeacherGroup(string roomId) => $"room:{roomId}:teacher";
    public static string StudentsGroup(string roomId) => $"room:{roomId}:students";
}

internal sealed class FakeTokenGenerator : ITokenGenerator
{
    private int _counter;
    public string JoinToken { get; set; } = "JOINTOK1";
    public string TeacherToken { get; set; } = "teacher-token-1";

    public string GenerateRoomId() => $"room-{++_counter}";
    public string GenerateJoinToken() => JoinToken;
    public string GenerateTeacherToken() => TeacherToken;
}

internal sealed class RecordingGroupManager : IGroupManager
{
    public List<(string ConnectionId, string GroupName)> Added { get; } = new();
    public List<(string ConnectionId, string GroupName)> Removed { get; } = new();

    public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
    {
        Added.Add((connectionId, groupName));
        return Task.CompletedTask;
    }

    public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
    {
        Removed.Add((connectionId, groupName));
        return Task.CompletedTask;
    }
}

internal sealed class RecordingHubCallerClients : IHubCallerClients<IWhiteboardClient>
{
    public List<HubInvocation> Invocations { get; } = new();

    private IWhiteboardClient Target(string target) => new RecordingClient(Invocations, target);

    public IWhiteboardClient Caller => Target("Caller");
    public IWhiteboardClient Others => Target("Others");
    public IWhiteboardClient OthersInGroup(string groupName) => Target($"OthersInGroup:{groupName}");

    public IWhiteboardClient All => Target("All");
    public IWhiteboardClient AllExcept(IReadOnlyList<string> excludedConnectionIds) => Target("AllExcept");
    public IWhiteboardClient Client(string connectionId) => Target($"Client:{connectionId}");
    public IWhiteboardClient Clients(IReadOnlyList<string> connectionIds) => Target("Clients");
    public IWhiteboardClient Group(string groupName) => Target($"Group:{groupName}");
    public IWhiteboardClient GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => Target($"GroupExcept:{groupName}");
    public IWhiteboardClient Groups(IReadOnlyList<string> groupNames) => Target("Groups");
    public IWhiteboardClient User(string userId) => Target($"User:{userId}");
    public IWhiteboardClient Users(IReadOnlyList<string> userIds) => Target("Users");

    private sealed class RecordingClient : IWhiteboardClient
    {
        private readonly List<HubInvocation> _sink;
        private readonly string _target;

        public RecordingClient(List<HubInvocation> sink, string target)
        {
            _sink = sink;
            _target = target;
        }

        private Task Record(string method, object? payload)
        {
            _sink.Add(new HubInvocation(_target, method, payload));
            return Task.CompletedTask;
        }

        public Task ParticipantJoined(ParticipantJoined participant) => Record(nameof(ParticipantJoined), participant);
        public Task ParticipantLeft(ParticipantLeft info) => Record(nameof(ParticipantLeft), info);
        public Task ReceiveStrokeBatch(StrokeBatch batch) => Record(nameof(ReceiveStrokeBatch), batch);
        public Task ReceiveShape(ShapeDrawn shape) => Record(nameof(ReceiveShape), shape);
        public Task ConfidenceChanged(ConfidenceChanged message) => Record(nameof(ConfidenceChanged), message);
        public Task StrokeUndone(StrokeUndone message) => Record(nameof(StrokeUndone), message);
        public Task BoardCleared(BoardCleared message) => Record(nameof(BoardCleared), message);
        public Task StudentLocked(StudentLocked message) => Record(nameof(StudentLocked), message);
        public Task WaitingRoomStateChanged(WaitingRoomStateChanged message) => Record(nameof(WaitingRoomStateChanged), message);
        public Task QuestionChanged(QuestionChanged message) => Record(nameof(QuestionChanged), message);
        public Task AnsweredChanged(AnsweredChanged message) => Record(nameof(AnsweredChanged), message);
        public Task Kicked() => Record(nameof(Kicked), null);
    }
}

internal sealed class FakeHubCallerContext : HubCallerContext
{
    public FakeHubCallerContext(string connectionId) => ConnectionId = connectionId;

    public override string ConnectionId { get; }
    public override string? UserIdentifier => null;
    public override ClaimsPrincipal? User => null;
    public override IDictionary<object, object?> Items { get; } = new Dictionary<object, object?>();
    public override IFeatureCollection Features { get; } = new FeatureCollection();
    public override CancellationToken ConnectionAborted => CancellationToken.None;
    public override void Abort() { }
}
