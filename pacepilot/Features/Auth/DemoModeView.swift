import SwiftUI

struct DemoModeView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        VStack(spacing: PPSpacing.lg) {
            Image("PacePilotLogo")
                .resizable()
                .frame(width: 72, height: 72)
            Text("Sample Plan")
                .font(PPTypography.title)
            Text("Explore a complete 10K training week with sample activities, coaching history, and privacy controls.")
                .foregroundStyle(PPColors.textMuted)
                .multilineTextAlignment(.center)
            PPButton(title: "Start Preview", systemImage: "play.fill") {
                appState.activateDemoMode()
            }
        }
        .padding(PPSpacing.lg)
        .ppScreen()
    }
}
