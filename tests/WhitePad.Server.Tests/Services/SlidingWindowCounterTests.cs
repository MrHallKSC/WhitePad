using WhitePad.Server.Services;

namespace WhitePad.Server.Tests.Services;

public class SlidingWindowCounterTests
{
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    private static readonly DateTime Origin = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void TryAcquire_AllowsUpToLimit()
    {
        var counter = new SlidingWindowCounter();

        for (var i = 0; i < 5; i++)
        {
            Assert.True(counter.TryAcquire(limit: 5, Window, Origin));
        }
    }

    [Fact]
    public void TryAcquire_RejectsBeyondLimit()
    {
        var counter = new SlidingWindowCounter();

        for (var i = 0; i < 5; i++)
        {
            counter.TryAcquire(limit: 5, Window, Origin);
        }

        Assert.False(counter.TryAcquire(limit: 5, Window, Origin));
    }

    [Fact]
    public void TryAcquire_RecoversAfterWindowSlides()
    {
        var counter = new SlidingWindowCounter();

        for (var i = 0; i < 5; i++)
        {
            counter.TryAcquire(limit: 5, Window, Origin);
        }

        Assert.False(counter.TryAcquire(limit: 5, Window, Origin.AddSeconds(30)));
        Assert.True(counter.TryAcquire(limit: 5, Window, Origin.AddSeconds(61)));
    }

    [Fact]
    public void TryAcquire_LimitZeroAlwaysRejects()
    {
        var counter = new SlidingWindowCounter();

        Assert.False(counter.TryAcquire(limit: 0, Window, Origin));
    }

    [Fact]
    public void TryAcquire_OldEntriesAreEvicted()
    {
        var counter = new SlidingWindowCounter();

        // Fill the window completely at t=0
        for (var i = 0; i < 10; i++)
        {
            counter.TryAcquire(limit: 10, Window, Origin);
        }

        // Slightly later: still inside the window, should be rejected.
        Assert.False(counter.TryAcquire(limit: 10, Window, Origin.AddSeconds(10)));

        // After the window fully passes, every slot is available again.
        for (var i = 0; i < 10; i++)
        {
            Assert.True(counter.TryAcquire(limit: 10, Window, Origin.AddMinutes(2)));
        }

        Assert.False(counter.TryAcquire(limit: 10, Window, Origin.AddMinutes(2)));
    }
}
