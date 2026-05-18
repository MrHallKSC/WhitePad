import Foundation

struct StudentSession: Equatable, Identifiable {
    var id: String { studentId }

    let studentId: String
    let displayName: String
    let joinLink: JoinLink
    let isLocked: Bool
    let waitingRoomEnabled: Bool
    let waitingRoomUnlocked: Bool
    let currentQuestion: String?
}
