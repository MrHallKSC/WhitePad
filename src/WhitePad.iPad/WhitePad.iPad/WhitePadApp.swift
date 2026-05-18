import SwiftUI

@main
struct WhitePadApp: App {
    @StateObject private var appRouter = AppRouter()

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(appRouter)
                .onOpenURL { url in
                    appRouter.handleIncomingURL(url)
                }
        }
    }
}
