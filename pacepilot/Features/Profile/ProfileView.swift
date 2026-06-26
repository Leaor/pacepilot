import SwiftUI

struct ProfileView: View {
    @Environment(\.appEnvironment) private var environment
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var appState: AppState
    @State private var stravaResult: StravaActionResult?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: PPSpacing.md) {
                        Image("PacePilotLogo")
                            .resizable()
                            .frame(width: 58, height: 58)
                        VStack(alignment: .leading) {
                            Text(appState.profile.name)
                                .font(PPTypography.title)
                            Text("\(appState.profile.goal.title) - \(appState.subscription.tier.title)")
                                .foregroundStyle(PPColors.textMuted)
                        }
                    }
                }
                .listRowBackground(PPColors.surfaceNavy)

                Section("Training") {
                    NavigationLink("Progress Dashboard") { ProgressDashboardView() }
                    NavigationLink("Gear and Shoes") { GearView() }
                    NavigationLink("Paywall and Entitlements") { PaywallView() }
                }

                Section("Connected Services") {
                    ConnectedServiceCard(
                        title: "Strava",
                        status: StravaService().status(
                            isConnected: !appState.stravaActivities().isEmpty,
                            lastSync: appState.stravaActivities().first?.startedAt,
                            cachedActivities: appState.stravaActivities().count
                        ),
                        warning: "AI coaching does not use Strava API/cache data.",
                        connectTitle: "Connect",
                        onConnect: connectStrava,
                        onDisconnect: disconnectStrava,
                        onDeleteCache: deleteStravaCache
                    )
                    ConnectedServiceCard(
                        title: "Garmin",
                        status: GarminService(featureEnabled: environment.garminFeatureEnabled, mockMode: environment.mockGarmin).status(),
                        warning: "Garmin coaching use requires explicit consent.",
                        connectTitle: "Manage",
                        onConnect: {},
                        onDisconnect: {},
                        onDeleteCache: {}
                    )
                }

                Section("Privacy and Support") {
                    NavigationLink("Privacy Center") { PrivacyCenterView() }
                    NavigationLink("Support") { SupportView() }
                }

                Section("Account") {
                    Button("Export training plan to calendar") {}
                    Button("Sign out") {
                        appState.isAuthenticated = false
                        appState.isDemoMode = false
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .ppTabSafeAreaPadding()
            .navigationTitle("Profile")
            .alert(stravaResult?.title ?? "Strava", isPresented: Binding(get: { stravaResult != nil }, set: { if !$0 { stravaResult = nil } })) {
                Button("OK") { stravaResult = nil }
            } message: {
                Text(stravaResult?.message ?? "")
            }
        }
    }

    private func connectStrava() {
        Task {
            let result = await StravaService().connect(environment: environment)
            stravaResult = result
            if let destinationURL = result.destinationURL {
                openURL(destinationURL)
            }
        }
    }

    private func disconnectStrava() {
        Task {
            stravaResult = await StravaService().disconnect(environment: environment)
        }
    }

    private func deleteStravaCache() {
        Task {
            let result = await StravaService().deleteCachedData(environment: environment)
            appState.deleteStravaCache()
            stravaResult = result
        }
    }
}

struct ConnectedServiceCard: View {
    let title: String
    let status: ConnectedServiceStatus
    let warning: String
    let connectTitle: String
    let onConnect: () -> Void
    let onDisconnect: () -> Void
    let onDeleteCache: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: PPSpacing.sm) {
            HStack {
                Text(title)
                    .font(PPTypography.headline)
                Spacer()
                PPBadge(title: status.isConnected ? "Connected" : "Not connected", color: status.isConnected ? PPColors.easyGreen : PPColors.textMuted)
            }
            Text(status.message)
                .font(PPTypography.caption)
                .foregroundStyle(PPColors.textMuted)
            Text(warning)
                .font(PPTypography.caption)
                .foregroundStyle(PPColors.warning)
            HStack {
                Button(connectTitle, action: onConnect)
                Button("Disconnect", role: .destructive, action: onDisconnect)
                Button("Delete cached data", action: onDeleteCache)
            }
            .font(PPTypography.caption)
        }
    }
}
