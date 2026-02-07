namespace WhitePad.Server.Services;

public class TokenGenerator : ITokenGenerator
{
    public string GenerateRoomId() => Guid.NewGuid().ToString();

    public string GenerateJoinToken()
    {
        // 6-character alphanumeric token (avoid confusing characters)
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = new Random();
        return new string(Enumerable.Range(0, 6)
            .Select(_ => chars[random.Next(chars.Length)])
            .ToArray());
    }
}
