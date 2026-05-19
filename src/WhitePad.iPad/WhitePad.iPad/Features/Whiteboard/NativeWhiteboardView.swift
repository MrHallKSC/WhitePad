import SwiftUI

struct NativeWhiteboardView: View {
    @ObservedObject var session: StudentRoomSession

    private let strokeColor = "#000000"
    private let lineWidth = 4.0

    @State private var strokes: [DrawingStroke] = []
    @State private var recorder: DrawingStrokeRecorder?

    var body: some View {
        GeometryReader { _ in
            ZStack {
                VStack(spacing: 12) {
                    HStack {
                        Button {
                            undoLastStroke()
                        } label: {
                            Label("Undo", systemImage: "arrow.uturn.backward")
                        }
                        .disabled(session.isLocked || strokes.isEmpty)

                        Button(role: .destructive) {
                            clearBoard()
                        } label: {
                            Label("Clear", systemImage: "trash")
                        }
                        .disabled(session.isLocked || strokes.isEmpty)

                        Spacer()
                    }
                    .buttonStyle(.bordered)

                    canvas
                }

                if session.isLocked {
                    lockedOverlay
                }
            }
        }
        .aspectRatio(4 / 3, contentMode: .fit)
        .padding()
        .onChange(of: session.boardClearRevision) { _, _ in
            clearLocalBoard()
        }
    }

    private var canvas: some View {
        Canvas { context, size in
            for stroke in strokes {
                draw(stroke: stroke, in: &context, size: size)
            }

            if let recorder, let activeStrokeId = recorder.activeStrokeId, !recorder.activePoints.isEmpty {
                draw(
                    stroke: DrawingStroke(
                        id: activeStrokeId,
                        points: recorder.activePoints,
                        color: strokeColor,
                        lineWidth: lineWidth
                    ),
                    in: &context,
                    size: size
                )
            }
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .stroke(.quaternary, lineWidth: 1)
        }
        .overlay {
            GeometryReader { canvasGeometry in
                Color.clear
                    .contentShape(Rectangle())
                    .gesture(drawingGesture(canvasSize: canvasGeometry.size))
                    .allowsHitTesting(!session.isLocked)
            }
        }
    }

    private func drawingGesture(canvasSize: CGSize) -> some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .local)
            .onChanged { value in
                guard !session.isLocked else { return }
                appendPoint(at: value.location, canvasSize: canvasSize, isComplete: false)
            }
            .onEnded { value in
                guard !session.isLocked else { return }
                appendPoint(at: value.location, canvasSize: canvasSize, isComplete: true)
                finishStroke()
            }
    }

    private var lockedOverlay: some View {
        VStack(spacing: 12) {
            Image(systemName: "lock.fill")
                .font(.largeTitle)
            Text("Drawing is locked")
                .font(.title2.bold())
            Text("Your teacher will unlock the board when it is time to write.")
                .foregroundStyle(.secondary)
        }
        .padding(24)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func appendPoint(at location: CGPoint, canvasSize: CGSize, isComplete: Bool) {
        if recorder == nil {
            recorder = DrawingStrokeRecorder(
                studentId: session.studentId,
                color: strokeColor,
                lineWidth: lineWidth
            )
        }

        if let batch = recorder?.appendPoint(at: location, canvasSize: canvasSize, isComplete: isComplete) {
            send(batch)
        }
    }

    private func undoLastStroke() {
        guard let stroke = strokes.popLast() else { return }

        Task {
            await session.undoStroke(stroke.id)
        }
    }

    private func clearBoard() {
        clearLocalBoard()

        Task {
            await session.clearBoard()
        }
    }

    private func clearLocalBoard() {
        strokes = []
        recorder?.reset()
        recorder = nil
    }

    private func finishStroke() {
        guard let stroke = recorder?.finishStroke() else {
            recorder = nil
            return
        }

        strokes.append(stroke)
        recorder = nil
    }

    private func send(_ batch: StrokeBatch) {
        Task {
            await session.sendStrokeBatch(batch)
        }
    }

    private func draw(stroke: DrawingStroke, in context: inout GraphicsContext, size: CGSize) {
        guard let firstPoint = stroke.points.first else { return }

        var path = Path()
        path.move(to: denormalize(firstPoint, size: size))

        for point in stroke.points.dropFirst() {
            path.addLine(to: denormalize(point, size: size))
        }

        context.stroke(
            path,
            with: .color(.black),
            style: StrokeStyle(lineWidth: stroke.lineWidth, lineCap: .round, lineJoin: .round)
        )
    }

    private func denormalize(_ point: StrokePoint, size: CGSize) -> CGPoint {
        CGPoint(x: point.x * size.width, y: point.y * size.height)
    }

}
