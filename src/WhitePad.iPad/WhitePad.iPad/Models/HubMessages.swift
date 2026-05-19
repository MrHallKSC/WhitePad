import Foundation

struct StudentLocked: Decodable, Equatable {
    let studentId: String
    let isLocked: Bool
}

struct WaitingRoomStateChanged: Decodable, Equatable {
    let waitingRoomEnabled: Bool
    let waitingRoomUnlocked: Bool
}

struct QuestionChanged: Decodable, Equatable {
    let question: String?
}

struct BoardCleared: Decodable, Equatable {
    let studentId: String
}

enum ConfidenceLevel: String, CaseIterable, Identifiable {
    case none
    case red
    case amber
    case green

    var id: String { rawValue }

    var label: String {
        switch self {
        case .none:
            return "Not set"
        case .red:
            return "Need help"
        case .amber:
            return "Unsure"
        case .green:
            return "Got it"
        }
    }

    var symbol: String {
        switch self {
        case .none:
            return "circle"
        case .red:
            return "circle.fill"
        case .amber:
            return "circle.fill"
        case .green:
            return "circle.fill"
        }
    }
}
