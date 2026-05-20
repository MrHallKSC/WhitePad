import XCTest
@testable import WhitePad_iPad

@MainActor
final class WhiteboardHubClientCommandTests: XCTestCase {
    func testEncodesSendStrokeBatchInvocation() throws {
        let client = makeClient()
        let batch = StrokeBatch(
            studentId: "student-1",
            strokeId: "stroke-1",
            points: [
                StrokePoint(x: 0.25, y: 0.5, pressure: 0.5),
                StrokePoint(x: 0.75, y: 1.0, pressure: 0.8)
            ],
            color: "#000000",
            lineWidth: 4,
            isComplete: true
        )

        let message = try decodeInvocation(
            client.makeInvocationRecord(target: "SendStrokeBatch", arguments: [batch])
        )

        XCTAssertEqual(message.type, 1)
        XCTAssertEqual(message.target, "SendStrokeBatch")
        XCTAssertNil(message.invocationId)
        XCTAssertEqual(message.arguments.count, 1)

        let payload = try XCTUnwrap(message.arguments.first)
        XCTAssertEqual(payload["studentId"] as? String, "student-1")
        XCTAssertEqual(payload["strokeId"] as? String, "stroke-1")
        XCTAssertEqual(payload["color"] as? String, "#000000")
        XCTAssertEqual(payload["lineWidth"] as? Double, 4)
        XCTAssertEqual(payload["backgroundType"] as? String, "none")
        XCTAssertEqual(payload["paperColor"] as? String, "white")
        XCTAssertEqual(payload["isEraser"] as? Bool, false)
        XCTAssertEqual(payload["isComplete"] as? Bool, true)

        let points = try XCTUnwrap(payload["points"] as? [[String: Any]])
        XCTAssertEqual(points.count, 2)
        XCTAssertEqual(points[0]["x"] as? Double, 0.25)
        XCTAssertEqual(points[0]["y"] as? Double, 0.5)
        XCTAssertEqual(points[1]["x"] as? Double, 0.75)
        XCTAssertEqual(points[1]["y"] as? Double, 1.0)
        XCTAssertEqual(points[1]["pressure"] as? Double, 0.8)
    }

    func testEncodesUndoStrokeInvocation() throws {
        let client = makeClient()

        let message = try decodeInvocation(
            client.makeInvocationRecord(target: "UndoStroke", arguments: ["stroke-1"])
        )

        XCTAssertEqual(message.target, "UndoStroke")
        XCTAssertEqual(message.rawArguments.first as? String, "stroke-1")
    }

    func testEncodesSendShapeInvocation() throws {
        let client = makeClient()
        let shape = WhiteboardShape(
            shapeId: "student-1-shape-1",
            studentId: "student-1",
            type: .rectangle,
            points: [
                StrokePoint(x: 0.2, y: 0.3),
                StrokePoint(x: 0.7, y: 0.8)
            ],
            color: "#1266CC",
            lineWidth: 6,
            backgroundType: .dotted,
            paperColor: .buff,
            isComplete: true
        )

        let message = try decodeInvocation(
            client.makeInvocationRecord(target: "SendShape", arguments: [shape])
        )

        XCTAssertEqual(message.type, 1)
        XCTAssertEqual(message.target, "SendShape")
        XCTAssertEqual(message.arguments.count, 1)

        let payload = try XCTUnwrap(message.arguments.first)
        XCTAssertEqual(payload["shapeId"] as? String, "student-1-shape-1")
        XCTAssertEqual(payload["studentId"] as? String, "student-1")
        XCTAssertEqual(payload["type"] as? String, "rectangle")
        XCTAssertEqual(payload["color"] as? String, "#1266CC")
        XCTAssertEqual(payload["lineWidth"] as? Double, 6)
        XCTAssertEqual(payload["backgroundType"] as? String, "dotted")
        XCTAssertEqual(payload["paperColor"] as? String, "buff")
        XCTAssertEqual(payload["isComplete"] as? Bool, true)

        let points = try XCTUnwrap(payload["points"] as? [[String: Any]])
        XCTAssertEqual(points.count, 2)
        XCTAssertEqual(points[0]["x"] as? Double, 0.2)
        XCTAssertEqual(points[1]["y"] as? Double, 0.8)
    }

    func testEncodesClearBoardInvocationWithoutArguments() throws {
        let client = makeClient()

        let message = try decodeInvocation(client.makeInvocationRecord(target: "ClearBoard"))

        XCTAssertEqual(message.target, "ClearBoard")
        XCTAssertTrue(message.rawArguments.isEmpty)
    }

    private func makeClient() -> WhiteboardHubClient {
        WhiteboardHubClient(serverBaseURL: URL(string: "http://localhost:5173")!)
    }

    private func decodeInvocation(_ record: String) throws -> InvocationMessage {
        XCTAssertTrue(record.hasSuffix("\u{1e}"))
        let trimmedRecord = String(record.dropLast())
        let data = try XCTUnwrap(trimmedRecord.data(using: .utf8))
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])

        return InvocationMessage(
            type: try XCTUnwrap(object["type"] as? Int),
            invocationId: object["invocationId"] as? String,
            target: try XCTUnwrap(object["target"] as? String),
            rawArguments: try XCTUnwrap(object["arguments"] as? [Any])
        )
    }
}

private struct InvocationMessage {
    let type: Int
    let invocationId: String?
    let target: String
    let rawArguments: [Any]

    var arguments: [[String: Any]] {
        rawArguments.compactMap { $0 as? [String: Any] }
    }
}
