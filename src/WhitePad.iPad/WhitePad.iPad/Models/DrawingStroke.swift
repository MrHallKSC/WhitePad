import Foundation

struct StrokePoint: Codable, Equatable {
    let x: Double
    let y: Double
    let pressure: Double
    let timestamp: Int?

    init(x: Double, y: Double, pressure: Double = 0.5, timestamp: Int? = nil) {
        self.x = x
        self.y = y
        self.pressure = pressure
        self.timestamp = timestamp
    }
}

struct StrokeBatch: Codable, Equatable {
    var studentId: String
    let strokeId: String
    let points: [StrokePoint]
    let color: String
    let lineWidth: Double
    let backgroundType: String
    let paperColor: String
    let isEraser: Bool
    let isComplete: Bool

    init(
        studentId: String,
        strokeId: String,
        points: [StrokePoint],
        color: String = "#000000",
        lineWidth: Double = 4,
        backgroundType: String = "none",
        paperColor: String = "white",
        isEraser: Bool = false,
        isComplete: Bool
    ) {
        self.studentId = studentId
        self.strokeId = strokeId
        self.points = points
        self.color = color
        self.lineWidth = lineWidth
        self.backgroundType = backgroundType
        self.paperColor = paperColor
        self.isEraser = isEraser
        self.isComplete = isComplete
    }
}

struct DrawingStroke: Identifiable, Equatable {
    let id: String
    var points: [StrokePoint]
    let color: String
    let lineWidth: Double
}
