namespace WhitePad.Server.Services;

public interface ITokenGenerator
{
    string GenerateRoomId();
    string GenerateJoinToken();
}
