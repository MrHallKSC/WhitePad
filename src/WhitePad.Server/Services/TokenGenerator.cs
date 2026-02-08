namespace WhitePad.Server.Services;

public class TokenGenerator : ITokenGenerator
{
    public string GenerateRoomId() => Guid.NewGuid().ToString();

    public string GenerateJoinToken()
    {
        // 6-character alphanumeric token (avoid confusing characters)
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(Enumerable.Range(0, 6)
            .Select(_ => chars[Random.Shared.Next(chars.Length)])
            .ToArray());
    }
}
