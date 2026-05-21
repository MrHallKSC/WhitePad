using System.Security.Cryptography;

namespace WhitePad.Server.Services;

public class TokenGenerator : ITokenGenerator
{
    // Confusion-free alphabet (no 0/O/1/I) so a teacher can read out the
    // token if QR scanning isn't available.
    private const string JoinTokenChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private const string TeacherTokenChars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public string GenerateRoomId() => Guid.NewGuid().ToString();

    // 8 chars from a 32-char CSPRNG ≈ 40 bits of entropy. Combined with the
    // per-connection rate limit on JoinRoomAsStudent, brute-forcing is
    // infeasible. QR-friendly length keeps fallback by readout possible.
    public string GenerateJoinToken() =>
        RandomNumberGenerator.GetString(JoinTokenChars, length: 8);

    // Teacher tokens authorize teacher-only hub methods. They never appear in
    // student-facing URLs/QR codes, so they must be unguessable: 32 chars from
    // a 62-char alphabet via CSPRNG ≈ 190 bits of entropy.
    public string GenerateTeacherToken() =>
        RandomNumberGenerator.GetString(TeacherTokenChars, length: 32);
}
