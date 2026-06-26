import SwiftUI

struct DemoModeView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        VStack(spacing: PPSpacing.lg) {
            Image("PacePilotLogo")
                .resizable()
                .frame(width: 72, height: 72)
            Text("Demo Mode")
                .font(PPTypography.title)
            Text("Explore Michael’s 10K plan with mock subscription, mock AI, and no production secrets.")
                .foregroundStyle(PPColors.textMuted)
                .multilineTextAlignment(.center)
            PPButton(title: "Start Demo", systemImage: "play.fill") {
                appState.activateDemoMode()
            }
        }
        .padding(PPSpacing.lg)
        .ppScreen()
    }
}
