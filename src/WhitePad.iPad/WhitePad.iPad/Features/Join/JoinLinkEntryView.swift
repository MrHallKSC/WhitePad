import SwiftUI

struct JoinLinkEntryView: View {
    @EnvironmentObject private var appRouter: AppRouter
    @State private var joinURLText = ""

    var errorMessage: String?

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("WhitePad")
                    .font(.largeTitle.bold())
                Text("Paste a class join link to check the native iPad launch flow.")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Join URL")
                    .font(.headline)
                TextField("https://server:5001/join?roomId=...&token=...", text: $joinURLText, axis: .vertical)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
                    .lineLimit(2...4)
                    .padding(12)
                    .background(.background)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                if let errorMessage {
                    Text(errorMessage)
                        .font(.subheadline)
                        .foregroundStyle(.red)
                }
            }

            Button {
                appRouter.resolve(rawURL: joinURLText)
            } label: {
                Text("Parse Join Link")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(joinURLText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

            Text("Stage 0 only parses links. SignalR joining starts in Stage 1.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(32)
        .frame(maxWidth: 620)
        .navigationTitle("Join")
    }
}
