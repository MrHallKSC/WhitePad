import SwiftUI

struct JoinedRoomView: View {
    @EnvironmentObject private var appRouter: AppRouter
    @ObservedObject var session: StudentRoomSession

    var body: some View {
        Group {
            if session.wasKicked {
                kickedView
            } else {
                classroomView
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var classroomView: some View {
        NativeWhiteboardView(session: session) {
            appRouter.reset()
        }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(.systemGroupedBackground))
            .toolbar(.hidden, for: .navigationBar)
            .ignoresSafeArea(.container, edges: [.horizontal, .bottom])
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
