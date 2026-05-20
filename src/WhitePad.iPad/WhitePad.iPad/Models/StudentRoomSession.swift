import Foundation

@MainActor
final class StudentRoomSession: ObservableObject {
    let studentId: String
    let displayName: String
    let joinLink: JoinLink
    private let hubClient: WhiteboardHubClientProtocol

    @Published var isLocked: Bool
    @Published var isInWaitingRoomFlow: Bool
    @Published var waitingRoomEnabled: Bool
    @Published var waitingRoomUnlocked: Bool
    @Published var currentQuestion: String?
    @Published var hasAnswered = false
    @Published var confidenceLevel: ConfidenceLevel = .none
    @Published var wasKicked = false
    @Published var statusMessage: String?
    @Published var boardClearRevision = 0

    init(
        studentId: String,
        displayName: String,
        joinLink: JoinLink,
        isLocked: Bool,
        waitingRoomEnabled: Bool,
        waitingRoomUnlocked: Bool,
        currentQuestion: String?,
        hubClient: WhiteboardHubClientProtocol
    ) {
        self.studentId = studentId
        self.displayName = displayName
        self.joinLink = joinLink
        self.isLocked = false
        self.isInWaitingRoomFlow = false
        self.waitingRoomEnabled = false
        self.waitingRoomUnlocked = true
        self.currentQuestion = currentQuestion
        self.hubClient = hubClient

        wireHubEvents()
    }

    func joinFromWaitingRoom() async {
        isInWaitingRoomFlow = false
        waitingRoomEnabled = false
        waitingRoomUnlocked = true
        isLocked = false
    }

    func setAnswered(_ value: Bool) async {
        hasAnswered = value

        do {
            try await hubClient.setAnswered(value)
        } catch {
            hasAnswered.toggle()
            statusMessage = "Could not update answered state."
        }
    }

    func setConfidence(_ level: ConfidenceLevel) async {
        let previous = confidenceLevel
        confidenceLevel = level

        do {
            try await hubClient.setConfidence(level.rawValue)
        } catch {
            confidenceLevel = previous
            statusMessage = "Could not update confidence."
        }
    }

    func sendStrokeBatch(_ batch: StrokeBatch) async {
        do {
            try await hubClient.sendStrokeBatch(batch)
        } catch {
            statusMessage = "Could not send drawing to the teacher."
        }
    }

    func sendShape(_ shape: WhiteboardShape) async {
        do {
            try await hubClient.sendShape(shape)
        } catch {
            statusMessage = "Could not send shape to the teacher."
        }
    }

    func undoStroke(_ strokeId: String) async {
        do {
            try await hubClient.undoStroke(strokeId)
        } catch {
            statusMessage = "Could not undo on the teacher view."
        }
    }

    func clearBoard() async {
        do {
            try await hubClient.clearBoard()
        } catch {
            statusMessage = "Could not clear the teacher view."
        }
    }

    private func wireHubEvents() {
        hubClient.onStudentLocked = { [weak self] message in
            self?.applyStudentLocked(message)
        }

        hubClient.onWaitingRoomStateChanged = { [weak self] message in
            self?.applyWaitingRoomStateChanged(message)
        }

        hubClient.onQuestionChanged = { [weak self] message in
            self?.currentQuestion = message.question
            self?.hasAnswered = false
        }

        hubClient.onBoardCleared = { [weak self] message in
            guard let self, message.studentId == self.studentId else { return }
            self.boardClearRevision += 1
        }

        hubClient.onKicked = { [weak self] in
            self?.wasKicked = true
            self?.hubClient.stop()
        }
    }

    private func applyStudentLocked(_ message: StudentLocked) {
        guard message.studentId == studentId else { return }

        if message.isLocked {
            isLocked = true
            return
        }

        isLocked = false
        isInWaitingRoomFlow = false
    }

    private func applyWaitingRoomStateChanged(_ message: WaitingRoomStateChanged) {
        waitingRoomEnabled = false
        waitingRoomUnlocked = true
        isInWaitingRoomFlow = false

        if !message.waitingRoomEnabled {
            isLocked = false
        }
    }
}
