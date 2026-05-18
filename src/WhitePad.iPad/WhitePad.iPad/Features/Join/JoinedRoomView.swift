import SwiftUI

struct JoinedRoomView: View {
    @EnvironmentObject private var appRouter: AppRouter
    let session: StudentSession

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Joined WhitePad")
                        .font(.largeTitle.bold())
                    Text("You should now appear on the teacher dashboard.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 12)
            }

            Section("Student") {
                LabeledContent("Name", value: session.displayName)
                LabeledContent("Student ID", value: session.studentId)
            }

            Section("Room") {
                LabeledContent("Server", value: session.joinLink.serverBaseURL.absoluteString)
                LabeledContent("Room ID", value: session.joinLink.roomId)
                LabeledContent("Locked", value: session.isLocked ? "Yes" : "No")
                LabeledContent("Waiting Room", value: session.waitingRoomEnabled ? "On" : "Off")

                if let currentQuestion = session.currentQuestion, !currentQuestion.isEmpty {
                    LabeledContent("Question", value: currentQuestion)
                }
            }

            Section {
                Button("Leave And Join Another Room") {
                    appRouter.reset()
                }
            }
        }
        .navigationTitle("Joined")
    }
}
