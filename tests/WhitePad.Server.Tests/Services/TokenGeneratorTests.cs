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

        Assert.Equal(6, token.Length);
        Assert.All(token, ch => Assert.Contains(ch, allowed));
    }
}
