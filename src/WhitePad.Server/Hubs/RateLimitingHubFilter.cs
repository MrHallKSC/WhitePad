using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using WhitePad.Server.Services;

namespace WhitePad.Server.Hubs;

// Per-connection per-method sliding-window rate limit. State is cleaned up on
// disconnect. Limits are tuned so legitimate classroom use is unaffected while
// abuse (token brute force, room flood, message spam) is bounded.
public sealed class RateLimitingHubFilter : IHubFilter
{
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    // Per-minute caps. Stroke/shape methods are high-volume by design (the
    // client batches points every 50ms = 20 batches/sec, ~1200/min when
    // drawing continuously); we give them generous headroom.
    private static readonly IReadOnlyDictionary<string, int> MethodLimits =
        new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["CreateRoom"] = 5,
            ["JoinRoomAsStudent"] = 10,
            ["JoinRoomAsTeacher"] = 10,
            ["SendStrokeBatch"] = 2400,
            ["SendShape"] = 600,
        };

    private const int DefaultLimit = 120;

    private readonly ConcurrentDictionary<string, SlidingWindowCounter> _counters = new();
    private readonly ILogger<RateLimitingHubFilter> _logger;

    public RateLimitingHubFilter(ILogger<RateLimitingHubFilter> logger)
    {
        _logger = logger;
    }

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var method = invocationContext.HubMethodName;
        var connectionId = invocationContext.Context.ConnectionId;
        var limit = MethodLimits.GetValueOrDefault(method, DefaultLimit);
        var key = $"{connectionId}:{method}";
        var counter = _counters.GetOrAdd(key, _ => new SlidingWindowCounter());

        if (!counter.TryAcquire(limit, Window))
        {
            _logger.LogWarning(
                "Rate limit hit: connection {ConnectionId} method {Method} (limit {Limit}/min)",
                connectionId, method, limit);
            throw new HubException($"Rate limit exceeded for {method}. Slow down and try again.");
        }

        return await next(invocationContext);
    }

    public Task OnConnectedAsync(
        HubLifetimeContext context,
        Func<HubLifetimeContext, Task> next) => next(context);

    public async Task OnDisconnectedAsync(
        HubLifetimeContext context,
        Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next)
    {
        var prefix = context.Context.ConnectionId + ":";
        foreach (var key in _counters.Keys.Where(k => k.StartsWith(prefix, StringComparison.Ordinal)).ToList())
        {
            _counters.TryRemove(key, out _);
        }
        await next(context, exception);
    }
}
