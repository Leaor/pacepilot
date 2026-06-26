import SwiftUI

@main
struct PacePilotApp: App {
    @StateObject private var appState = AppState()
    private let environment = AppEnvironment.development

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environment(\.appEnvironment, environment)
                .preferredColorScheme(.dark)
        }
    }
}
