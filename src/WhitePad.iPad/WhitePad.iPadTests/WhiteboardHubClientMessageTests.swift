import XCTest
@testable import WhitePad_iPad

@MainActor
final class WhiteboardHubClientMessageTests: XCTestCase {
    func testDecodesStudentLockedMessage() async throws {
        let client = makeClient()
        var received: StudentLocked?
        client.onStudentLocked = { received = $0 }

        try await client.handleIncomingRecord(#"{"type":1,"target":"studentLocked","arguments":[{"studentId":"student-1","isLocked":true}]}"#)

        XCTAssertEqual(received, StudentLocked(studentId: "student-1", isLocked: true))
    }

    func testDecodesWaitingRoomStateChangedMessage() async throws {
        let client = makeClient()
        var received: WaitingRoomStateChanged?
        client.onWaitingRoomStateChanged = { received = $0 }

        try await client.handleIncomingRecord(#"{"type":1,"target":"waitingRoomStateChanged","arguments":[{"waitingRoomEnabled":true,"waitingRoomUnlocked":false}]}"#)

        XCTAssertEqual(received, WaitingRoomStateChanged(waitingRoomEnabled: true, waitingRoomUnlocked: false))
    }

    func testDecodesQuestionChangedMessage() async throws {
        let client = makeClient()
        var received: QuestionChanged?
        client.onQuestionChanged = { received = $0 }

        try await client.handleIncomingRecord(#"{"type":1,"target":"questionChanged","arguments":[{"question":"Explain your answer"}]}"#)

        XCTAssertEqual(received, QuestionChanged(question: "Explain your answer"))
    }

    func testDecodesKickedMessage() async throws {
        let client = makeClient()
        var wasKicked = false
        client.onKicked = { wasKicked = true }

        try await client.handleIncomingRecord(#"{"type":1,"target":"kicked","arguments":[]}"#)

        XCTAssertTrue(wasKicked)
    }

    func testDecodesBoardClearedMessage() async throws {
        let client = makeClient()
        var received: BoardCleared?
        client.onBoardCleared = { received = $0 }

        try await client.handleIncomingRecord(#"{"type":1,"target":"boardCleared","arguments":[{"studentId":"student-1"}]}"#)

        XCTAssertEqual(received, BoardCleared(studentId: "student-1"))
    }

    func testIgnoresCompletionMessages() async throws {
        let client = makeClient()
        var wasKicked = false
        client.onKicked = { wasKicked = true }

        try await client.handleIncomingRecord(#"{"type":3,"invocationId":"1","result":{}}"#)

        XCTAssertFalse(wasKicked)
    }

    private func makeClient() -> WhiteboardHubClient {
        WhiteboardHubClient(serverBaseURL: URL(string: "http://localhost:5173")!)
    }
}
