using Microsoft.AspNetCore.SignalR;
using WhitePad.Server.Hubs;
using WhitePad.Server.Models;

namespace WhitePad.Server.Services;

// Sweeps the in-memory room store, removing rooms whose LastActivityAt is
// older than the configured TTL. Hub methods bump LastActivityAt on activity,
// so a room with active drawing or teacher control stays alive indefinitely.
// Default TTL is 12h, configurable via Room:ExpirationHours.
public sealed class RoomExpirationService : BackgroundService
{
    private static readonly TimeSpan SweepInterval = TimeSpan.FromMinutes(5);

    private readonly IRoomStateManager _roomStateManager;
    private readonly IHubContext<WhiteboardHub, IWhiteboardClient> _hubContext;
    private readonly ILogger<RoomExpirationService> _logger;
    private readonly TimeSpan _expiration;

    public RoomExpirationService(
        IRoomStateManager roomStateManager,
        IHubContext<WhiteboardHub, IWhiteboardClient> hubContext,
        IConfiguration configuration,
        ILogger<RoomExpirationService> logger)
    {
        _roomStateManager = roomStateManager;
        _hubContext = hubContext;
        _logger = logger;

        var hours = configuration.GetValue<double?>("Room:ExpirationHours") ?? 12.0;
        _expiration = TimeSpan.FromHours(hours);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "RoomExpirationService started; TTL = {Hours}h, sweep every {Interval}",
            _expiration.TotalHours, SweepInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SweepAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Room expiration sweep failed");
            }

            try
            {
                await Task.Delay(SweepInterval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    private async Task SweepAsync()
    {
        var cutoff = DateTime.UtcNow - _expiration;
        var rooms = await _roomStateManager.GetAllRoomsAsync();

        foreach (var room in rooms.Where(r => r.LastActivityAt < cutoff).ToList())
        {
            await ExpireRoomAsync(room);
        }
    }

    private async Task ExpireRoomAsync(Room room)
    {
        _logger.LogInformation(
            "Expiring room {RoomId} (last activity {LastActivity:o}, {Count} participants)",
            room.RoomId, room.LastActivityAt, room.Participants.Count);

        foreach (var student in room.Participants.ToList())
        {
            if (string.IsNullOrEmpty(student.ConnectionId)) continue;

            try
            {
                await _hubContext.Clients.Client(student.ConnectionId).Kicked();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to notify student {StudentId} that room {RoomId} expired",
                    student.StudentId, room.RoomId);
            }
        }

        await _roomStateManager.RemoveRoomAsync(room.RoomId);
    }
}
