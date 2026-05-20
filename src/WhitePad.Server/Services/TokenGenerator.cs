using System.Security.Cryptography;

namespace WhitePad.Server.Services;

public class TokenGenerator : ITokenGenerator
{
    private const string TeacherTokenChars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public string GenerateRoomId() => Guid.NewGuid().ToString();

    public string GenerateJoinToken()
    {
        // 6-character alphanumeric token (avoid confusing characters)
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(Enumerable.Range(0, 6)
            .Select(_ => chars[Random.Shared.Next(chars.Length)])
            .ToArray());
    }

    // Teacher tokens authorize teacher-only hub methods. They never appear in
    // student-facing URLs/QR codes, so they must be unguessable: 32 chars from
    // a 62-char alphabet via CSPRNG ≈ 190 bits of entropy.
    public string GenerateTeacherToken() =>
        RandomNumberGenerator.GetString(TeacherTokenChars, length: 32);
}
