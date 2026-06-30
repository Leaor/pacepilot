import SwiftUI

@main
struct PacePilotApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var authService = AuthService()
    private let environment = AppEnvironment.runtime()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environment(\.appEnvironment, environment)
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    guard url.scheme?.lowercased() == "pacepilot",
                          url.host?.lowercased() == "auth",
                          url.path == "/callback" else {
                        return
                    }

                    Task {
                        await authService.completeAuthCallback(url, environment: environment, appState: appState)
                    }
                }
        }
    }
}
