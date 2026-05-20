import Foundation

struct StrokePoint: Codable, Equatable, Sendable {
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

struct StrokeBatch: Codable, Equatable, Sendable {
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

struct DrawingStroke: Identifiable, Equatable, Sendable {
    let id: String
    var points: [StrokePoint]
    let color: String
    let lineWidth: Double
    let paperColor: PaperColor
    let isEraser: Bool

    init(
        id: String,
        points: [StrokePoint],
        color: String,
        lineWidth: Double,
        paperColor: PaperColor = .white,
        isEraser: Bool = false
    ) {
        self.id = id
        self.points = points
        self.color = color
        self.lineWidth = lineWidth
        self.paperColor = paperColor
        self.isEraser = isEraser
    }
}

enum DrawingTool: String, Codable, CaseIterable, Identifiable, Sendable {
    case pen
    case eraser
    case line
    case rectangle
    case circle
    case arrow
    case axesL
    case axesCross

    var id: String { rawValue }

    var label: String {
        switch self {
        case .pen: return "Pen"
        case .eraser: return "Eraser"
        case .line: return "Line"
        case .rectangle: return "Rectangle"
        case .circle: return "Circle"
        case .arrow: return "Arrow"
        case .axesL: return "L-Axes"
        case .axesCross: return "Cross"
        }
    }

    var symbol: String {
        switch self {
        case .pen: return "pencil"
        case .eraser: return "eraser"
        case .line: return "line.diagonal"
        case .rectangle: return "rectangle"
        case .circle: return "circle"
        case .arrow: return "arrow.up.right"
        case .axesL: return "angle"
        case .axesCross: return "plus"
        }
    }

    var isShape: Bool {
        switch self {
        case .line, .rectangle, .circle, .arrow, .axesL, .axesCross:
            return true
        case .pen, .eraser:
            return false
        }
    }
}

enum BackgroundType: String, Codable, CaseIterable, Identifiable, Sendable {
    case none
    case dotted
    case lined
    case squares

    var id: String { rawValue }

    var label: String {
        switch self {
        case .none: return "Plain"
        case .dotted: return "Dots"
        case .lined: return "Lines"
        case .squares: return "Squares"
        }
    }
}

enum PaperColor: String, Codable, CaseIterable, Identifiable, Sendable {
    case white
    case buff

    var id: String { rawValue }

    var label: String {
        switch self {
        case .white: return "White"
        case .buff: return "Buff"
        }
    }

    var hex: String {
        switch self {
        case .white: return "#FFFFFF"
        case .buff: return "#F3E7C9"
        }
    }
}

struct WhiteboardShape: Codable, Identifiable, Equatable, Sendable {
    let shapeId: String
    var studentId: String
    let type: DrawingTool
    let points: [StrokePoint]
    let color: String
    let lineWidth: Double
    let backgroundType: BackgroundType
    let paperColor: PaperColor
    let isComplete: Bool

    var id: String { shapeId }

    private enum CodingKeys: String, CodingKey {
        case shapeId
        case studentId
        case type
        case points
        case color
        case lineWidth
        case backgroundType
        case paperColor
        case isComplete
    }

    init(
        shapeId: String,
        studentId: String,
        type: DrawingTool,
        points: [StrokePoint],
        color: String,
        lineWidth: Double,
        backgroundType: BackgroundType,
        paperColor: PaperColor,
        isComplete: Bool
    ) {
        self.shapeId = shapeId
        self.studentId = studentId
        self.type = type
        self.points = points
        self.color = color
        self.lineWidth = lineWidth
        self.backgroundType = backgroundType
        self.paperColor = paperColor
        self.isComplete = isComplete
    }
}
