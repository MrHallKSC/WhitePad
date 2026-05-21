using WhitePad.Server.Services;

namespace WhitePad.Server.Tests.Services;

public class TokenGeneratorTests
{
    [Fact]
    public void GenerateRoomId_ReturnsValidGuidString()
    {
        var generator = new TokenGenerator();

        var roomId = generator.GenerateRoomId();

        Assert.True(Guid.TryParse(roomId, out _));
    }

    [Fact]
    public void GenerateJoinToken_UsesExpectedLengthAndCharset()
    {
        var generator = new TokenGenerator();
        const string allowed = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        var token = generator.GenerateJoinToken();

        Assert.Equal(8, token.Length);
        Assert.All(token, ch => Assert.Contains(ch, allowed));
    }

    [Fact]
    public void GenerateTeacherToken_UsesExpectedLengthAndCharset()
    {
        var generator = new TokenGenerator();
        const string allowed =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        var token = generator.GenerateTeacherToken();

        Assert.Equal(32, token.Length);
        Assert.All(token, ch => Assert.Contains(ch, allowed));
    }

    [Fact]
    public void GenerateTeacherToken_ProducesUniqueValues()
    {
        var generator = new TokenGenerator();

        var tokens = Enumerable.Range(0, 100)
            .Select(_ => generator.GenerateTeacherToken())
            .ToHashSet();

        // 190 bits of entropy: collisions across 100 draws are astronomically unlikely.
        Assert.Equal(100, tokens.Count);
    }

    [Fact]
    public void GenerateJoinToken_ProducesUniqueValues()
    {
        var generator = new TokenGenerator();

        var tokens = Enumerable.Range(0, 100)
            .Select(_ => generator.GenerateJoinToken())
            .ToHashSet();

        Assert.Equal(100, tokens.Count);
    }
}
