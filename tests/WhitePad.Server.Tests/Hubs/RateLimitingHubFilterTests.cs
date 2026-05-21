using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using WhitePad.Server.Hubs;

namespace WhitePad.Server.Tests.Hubs;

public class RateLimitingHubFilterTests
{
    private sealed class DummyHub_ : Hub { }
    private static readonly Hub DummyHub = new DummyHub_();

    private static RateLimitingHubFilter CreateFilter() =>
        new(NullLogger<RateLimitingHubFilter>.Instance);

    private static ValueTask<object?> NoOp(HubInvocationContext _) =>
        ValueTask.FromResult<object?>(null);

    [Fact]
    public async Task InvokeMethodAsync_AllowsUpToMethodLimitThenThrows()
    {
        var filter = CreateFilter();
        var calls = 0;
        ValueTask<object?> Next(HubInvocationContext _) { calls++; return ValueTask.FromResult<object?>(null); }

        // CreateRoom limit is 5/min
        for (var i = 0; i < 5; i++)
        {
            await filter.InvokeMethodAsync(Context("conn-1", "CreateRoom"), Next);
        }

        await Assert.ThrowsAsync<HubException>(() =>
            filter.InvokeMethodAsync(Context("conn-1", "CreateRoom"), Next).AsTask());

        Assert.Equal(5, calls);
    }

    [Fact]
    public async Task InvokeMethodAsync_UnknownMethodUsesDefaultLimit()
    {
        var filter = CreateFilter();

        // Default limit is 120/min
        for (var i = 0; i < 120; i++)
        {
            await filter.InvokeMethodAsync(Context("conn-1", "SomeOtherMethod"), NoOp);
        }

        await Assert.ThrowsAsync<HubException>(() =>
            filter.InvokeMethodAsync(Context("conn-1", "SomeOtherMethod"), NoOp).AsTask());
    }

    [Fact]
    public async Task InvokeMethodAsync_LimitsAreIsolatedPerConnection()
    {
        var filter = CreateFilter();

        // Exhaust conn-1's CreateRoom budget
        for (var i = 0; i < 5; i++)
        {
            await filter.InvokeMethodAsync(Context("conn-1", "CreateRoom"), NoOp);
        }

        // conn-2 is a different connection and should be unaffected
        var result = await Record.ExceptionAsync(() =>
            filter.InvokeMethodAsync(Context("conn-2", "CreateRoom"), NoOp).AsTask());

        Assert.Null(result);
    }

    [Fact]
    public async Task InvokeMethodAsync_LimitsAreIsolatedPerMethod()
    {
        var filter = CreateFilter();

        // Exhaust conn-1's CreateRoom budget
        for (var i = 0; i < 5; i++)
        {
            await filter.InvokeMethodAsync(Context("conn-1", "CreateRoom"), NoOp);
        }

        // A different method on the same connection has its own counter
        var result = await Record.ExceptionAsync(() =>
            filter.InvokeMethodAsync(Context("conn-1", "JoinRoomAsStudent"), NoOp).AsTask());

        Assert.Null(result);
    }

    [Fact]
    public async Task OnDisconnectedAsync_ResetsCountersForThatConnection()
    {
        var filter = CreateFilter();

        // Exhaust conn-1's CreateRoom budget
        for (var i = 0; i < 5; i++)
        {
            await filter.InvokeMethodAsync(Context("conn-1", "CreateRoom"), NoOp);
        }

        await filter.OnDisconnectedAsync(LifetimeContext("conn-1"), null, (_, _) => Task.CompletedTask);

        // After cleanup the counter is gone, so the budget is fresh again
        var result = await Record.ExceptionAsync(() =>
            filter.InvokeMethodAsync(Context("conn-1", "CreateRoom"), NoOp).AsTask());

        Assert.Null(result);
    }

    // --- Helpers ---

    // Method names must match real hub methods so HubMethodName (= MethodInfo.Name) is correct.
    private static class HubMethodNames
    {
        public static void CreateRoom() { }
        public static void JoinRoomAsStudent() { }
        public static void SendStrokeBatch() { }
        public static void SomeOtherMethod() { }
    }

    private static HubInvocationContext Context(string connectionId, string methodName)
    {
        var method = typeof(HubMethodNames).GetMethod(methodName, BindingFlags.Public | BindingFlags.Static)
            ?? throw new InvalidOperationException($"No dummy method named {methodName}");

        return new HubInvocationContext(
            new FakeHubCallerContext(connectionId),
            EmptyServiceProvider.Instance,
            DummyHub,
            method,
            Array.Empty<object?>());
    }

    private static HubLifetimeContext LifetimeContext(string connectionId) =>
        new(new FakeHubCallerContext(connectionId), EmptyServiceProvider.Instance, DummyHub);

    private sealed class EmptyServiceProvider : IServiceProvider
    {
        public static readonly EmptyServiceProvider Instance = new();
        public object? GetService(Type serviceType) => null;
    }

    private sealed class FakeHubCallerContext : HubCallerContext
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
}
