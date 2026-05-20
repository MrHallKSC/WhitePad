namespace WhitePad.Server.Services;

// Thread-safe sliding-window rate limiter. Tracks invocation timestamps and
// rejects new acquisitions once the count in the trailing window equals the
// configured limit. Used by RateLimitingHubFilter, per (connectionId, method).
public sealed class SlidingWindowCounter
{
    private readonly Queue<DateTime> _timestamps = new();
    private readonly object _gate = new();

    public bool TryAcquire(int limit, TimeSpan window, DateTime now)
    {
        if (limit <= 0) return false;

        var cutoff = now - window;
        lock (_gate)
        {
            while (_timestamps.Count > 0 && _timestamps.Peek() < cutoff)
            {
                _timestamps.Dequeue();
            }

            if (_timestamps.Count >= limit) return false;
            _timestamps.Enqueue(now);
            return true;
        }
    }

    public bool TryAcquire(int limit, TimeSpan window) =>
        TryAcquire(limit, window, DateTime.UtcNow);
}
