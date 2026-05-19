import SwiftUI

struct JoinedRoomView: View {
    @EnvironmentObject private var appRouter: AppRouter
    @ObservedObject var session: StudentRoomSession

    var body: some View {
        Group {
            if session.wasKicked {
                kickedView
            } else if session.isInWaitingRoomFlow {
                waitingRoomView
            } else {
                classroomView
            }
        }
        .navigationTitle("WhitePad")
    }

    private var classroomView: some View {
        VStack(spacing: 0) {
            classroomHeader

            NativeWhiteboardView(session: session)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color(.systemGroupedBackground))
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    leaveButton
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }

    private var classroomHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(session.displayName)
                        .font(.headline)
                    Text(session.isLocked ? "Locked by teacher" : "Ready to draw")
                        .font(.subheadline)
                        .foregroundStyle(session.isLocked ? Color.secondary : Color.green)
                }

                Spacer()

                confidencePicker
            }

            if let currentQuestion = session.currentQuestion, !currentQuestion.isEmpty {
                HStack(spacing: 12) {
                    Text(currentQuestion)
                        .font(.title3)
                        .lineLimit(2)

                    Spacer()

                    Button {
                        Task {
                            await session.setAnswered(!session.hasAnswered)
                        }
                    } label: {
                        Label(
                            session.hasAnswered ? "Answered" : "Answer",
                            systemImage: session.hasAnswered ? "checkmark.circle.fill" : "circle"
                        )
                    }
                    .buttonStyle(.bordered)
                    .disabled(session.isLocked)
                }
            }

            if let statusMessage = session.statusMessage {
                Text(statusMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
        .padding()
        .background(.background)
    }

    private var confidencePicker: some View {
        Picker("Confidence", selection: Binding(
            get: { session.confidenceLevel },
            set: { level in
                Task {
                    await session.setConfidence(level)
                }
            }
        )) {
            ForEach(ConfidenceLevel.allCases) { level in
                Text(level.label)
                    .tag(level)
            }
        }
        .pickerStyle(.menu)
        .disabled(session.isLocked)
    }

    private var waitingRoomView: some View {
        VStack(spacing: 24) {
            Image(systemName: session.waitingRoomUnlocked ? "checkmark.circle.fill" : "lock.fill")
                .font(.system(size: 64))
                .foregroundStyle(session.waitingRoomUnlocked ? .green : .secondary)

            VStack(spacing: 8) {
                Text(session.waitingRoomUnlocked ? "Ready to join" : "Waiting room")
                    .font(.largeTitle.bold())
                Text(session.waitingRoomUnlocked ? "Your teacher has started the activity." : "Waiting for your teacher to start the activity.")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Text("Joined as \(session.displayName)")
                .font(.headline)

            if session.waitingRoomUnlocked {
                Button {
                    Task {
                        await session.joinFromWaitingRoom()
                    }
                } label: {
                    Text("Join Room")
                        .frame(maxWidth: 320)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }

            leaveButton
                .buttonStyle(.bordered)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var kickedView: some View {
        VStack(spacing: 24) {
            Image(systemName: "person.crop.circle.badge.xmark")
                .font(.system(size: 64))
                .foregroundStyle(.red)

            VStack(spacing: 8) {
                Text("Removed from session")
                    .font(.largeTitle.bold())
                Text("Your teacher has removed you from this WhitePad room.")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button("Join Another Room") {
                appRouter.reset()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var leaveButton: some View {
        Button("Leave And Join Another Room") {
            appRouter.reset()
        }
    }
}
