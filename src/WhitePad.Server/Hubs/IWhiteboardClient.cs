using WhitePad.Server.Models;
using WhitePad.Server.Models.Messages;

namespace WhitePad.Server.Hubs;

public interface IWhiteboardClient
{
    Task ParticipantJoined(ParticipantJoined participant);
    Task ParticipantLeft(ParticipantLeft info);
    Task ReceiveStrokeBatch(StrokeBatch batch);
    Task ConfidenceChanged(ConfidenceChanged message);
    Task StrokeUndone(StrokeUndone message);
    Task BoardCleared(BoardCleared message);
}
