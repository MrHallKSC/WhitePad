import Foundation

struct RoomSettings: Codable, Equatable {
    let isLocked: Bool
    let isFrozen: Bool
    let maxStudents: Int
}
