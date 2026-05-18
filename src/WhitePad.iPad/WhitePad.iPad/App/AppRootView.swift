import SwiftUI

struct AppRootView: View {
    @EnvironmentObject private var appRouter: AppRouter

    var body: some View {
        NavigationStack {
            switch appRouter.phase {
            case .idle:
                JoinLinkEntryView()
            case .resolvingJoinLink(let joinLink):
                ParsedJoinLinkView(joinLink: joinLink)
            case .joined(let session):
                JoinedRoomView(session: session)
            case .failed(let error):
                JoinLinkEntryView(errorMessage: error.message)
            }
        }
    }
}
