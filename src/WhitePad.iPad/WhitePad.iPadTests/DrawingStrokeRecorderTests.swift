import CoreGraphics
import XCTest
@testable import WhitePad_iPad

final class DrawingStrokeRecorderTests: XCTestCase {
    func testNormalizeClampsPointsToUnitCanvas() {
        XCTAssertEqual(
            DrawingStrokeRecorder.normalize(CGPoint(x: 50, y: 75), canvasSize: CGSize(width: 100, height: 150)),
            StrokePoint(x: 0.5, y: 0.5)
        )
        XCTAssertEqual(
            DrawingStrokeRecorder.normalize(CGPoint(x: -20, y: 300), canvasSize: CGSize(width: 100, height: 150)),
            StrokePoint(x: 0, y: 1)
        )
    }

    func testFirstPointImmediatelySendsInitialBatch() throws {
        var recorder = DrawingStrokeRecorder(studentId: "student-1", batchInterval: 0.05)

        let batch = try XCTUnwrap(recorder.appendPoint(
            at: CGPoint(x: 10, y: 20),
            canvasSize: CGSize(width: 100, height: 100),
            isComplete: false,
            now: Date(timeIntervalSince1970: 1),
            makeStrokeId: { "stroke-1" }
        ))

        XCTAssertEqual(batch.studentId, "student-1")
        XCTAssertEqual(batch.strokeId, "student-1-stroke-1")
        XCTAssertEqual(batch.points, [StrokePoint(x: 0.1, y: 0.2)])
        XCTAssertFalse(batch.isComplete)
    }

    func testBatchIsHeldUntilIntervalElapses() throws {
        var recorder = DrawingStrokeRecorder(studentId: "student-1", batchInterval: 0.05)
        let start = Date(timeIntervalSince1970: 1)

        _ = recorder.appendPoint(
            at: CGPoint(x: 10, y: 10),
            canvasSize: CGSize(width: 100, height: 100),
            isComplete: false,
            now: start,
            makeStrokeId: { "stroke-1" }
        )

        let heldBatch = recorder.appendPoint(
            at: CGPoint(x: 20, y: 20),
            canvasSize: CGSize(width: 100, height: 100),
            isComplete: false,
            now: start.addingTimeInterval(0.01),
            makeStrokeId: { "unused" }
        )
        XCTAssertNil(heldBatch)

        let emittedBatch = try XCTUnwrap(recorder.appendPoint(
            at: CGPoint(x: 30, y: 30),
            canvasSize: CGSize(width: 100, height: 100),
            isComplete: false,
            now: start.addingTimeInterval(0.06),
            makeStrokeId: { "unused" }
        ))
        XCTAssertEqual(emittedBatch.points, [
            StrokePoint(x: 0.2, y: 0.2),
            StrokePoint(x: 0.3, y: 0.3)
        ])
        XCTAssertFalse(emittedBatch.isComplete)
    }

    func testDuplicateFinalPointStillSendsCompletionBatch() throws {
        var recorder = DrawingStrokeRecorder(studentId: "student-1", batchInterval: 0.05)
        let start = Date(timeIntervalSince1970: 1)

        _ = recorder.appendPoint(
            at: CGPoint(x: 10, y: 10),
            canvasSize: CGSize(width: 100, height: 100),
            isComplete: false,
            now: start,
            makeStrokeId: { "stroke-1" }
        )

        let completionBatch = try XCTUnwrap(recorder.appendPoint(
            at: CGPoint(x: 10, y: 10),
            canvasSize: CGSize(width: 100, height: 100),
            isComplete: true,
            now: start.addingTimeInterval(0.01),
            makeStrokeId: { "unused" }
        ))

        XCTAssertEqual(completionBatch.points, [])
        XCTAssertTrue(completionBatch.isComplete)
    }

    func testFinishStrokeReturnsLocalStrokeAndResetsRecorder() throws {
        var recorder = DrawingStrokeRecorder(studentId: "student-1")

        _ = recorder.appendPoint(
            at: CGPoint(x: 25, y: 50),
            canvasSize: CGSize(width: 100, height: 100),
            isComplete: false,
            makeStrokeId: { "stroke-1" }
        )

        let stroke = try XCTUnwrap(recorder.finishStroke())

        XCTAssertEqual(stroke.id, "student-1-stroke-1")
        XCTAssertEqual(stroke.points, [StrokePoint(x: 0.25, y: 0.5)])
        XCTAssertNil(recorder.activeStrokeId)
        XCTAssertTrue(recorder.activePoints.isEmpty)
    }
}
