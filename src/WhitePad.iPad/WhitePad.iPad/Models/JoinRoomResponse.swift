import Foundation

struct JoinRoomResponse: Codable, Equatable {
    let success: Bool
    let studentId: String?
    let displayName: String?
    let roomSettings: RoomSettings?
    let isLocked: Bool?
    let waitingRoomEnabled: Bool?
    let waitingRoomUnlocked: Bool?
    let currentQuestion: String?
    let error: String?
}
