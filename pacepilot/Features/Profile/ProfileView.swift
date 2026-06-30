import SwiftUI

struct ProfileView: View {
    @Environment(\.appEnvironment) private var environment
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var appState: AppState
    @State private var actionResult: StravaActionResult?

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
                        cacheActionTitle: "Disconnect and clear cache",
                        onConnect: connectStrava,
                        onDisconnect: disconnectStrava,
                        onDeleteCache: deleteStravaCache
                    )
                    ConnectedServiceCard(
                        title: "Garmin",
                        status: GarminService(featureEnabled: environment.garminFeatureEnabled, mockMode: environment.mockGarmin).status(),
                        warning: "Garmin coaching use requires explicit consent.",
                        connectTitle: "Manage",
                        cacheActionTitle: "Delete cached data",
                        onConnect: showGarminStatus,
                        onDisconnect: showGarminStatus,
                        onDeleteCache: showGarminCacheStatus
                    )
                }

                Section("Privacy and Support") {
                    NavigationLink("Privacy Center") { PrivacyCenterView() }
                    NavigationLink("Support") { SupportView() }
                }

                Section("Account") {
                    Button("Export training plan to calendar") {
                        exportTrainingPlanCalendar()
                    }
                    Button("Sign out") {
                        signOut()
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .ppTabSafeAreaPadding()
            .navigationTitle("Profile")
            .alert(actionResult?.title ?? "Profile", isPresented: Binding(get: { actionResult != nil }, set: { if !$0 { actionResult = nil } })) {
                Button("OK") { actionResult = nil }
            } message: {
                Text(actionResult?.message ?? "")
            }
        }
    }

    private func connectStrava() {
        Task {
            let result = await StravaService().connect(environment: environment, supabase: supabaseService())
            actionResult = result
            if let destinationURL = result.destinationURL {
                openURL(destinationURL)
            }
        }
    }

    private func disconnectStrava() {
        Task {
            actionResult = await StravaService().disconnect(environment: environment, supabase: supabaseService())
        }
    }

    private func deleteStravaCache() {
        Task {
            let result = await StravaService().disconnectAndDeleteCachedData(environment: environment, supabase: supabaseService())
            if result.succeeded {
                appState.deleteStravaCache()
            }
            actionResult = result
        }
    }

    private func showGarminStatus() {
        actionResult = StravaActionResult(
            title: "Garmin unavailable",
            message: GarminService(featureEnabled: environment.garminFeatureEnabled, mockMode: environment.mockGarmin).status().message,
            destinationURL: nil
        )
    }

    private func showGarminCacheStatus() {
        actionResult = StravaActionResult(
            title: "Garmin cache unavailable",
            message: "Garmin cache controls will be enabled after partner approval and server-side sync support.",
            destinationURL: nil
        )
    }

    private func exportTrainingPlanCalendar() {
        do {
            let ics = CalendarExportService().ics(for: appState.trainingPlan, timezone: appState.profile.timezone)
            guard let data = ics.data(using: .utf8),
                  let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
                throw ProfileActionError.exportFailed
            }

            let fileURL = directory.appendingPathComponent("pacepilot-training-plan.ics")
            try data.write(to: fileURL, options: .atomic)
            actionResult = StravaActionResult(
                title: "Calendar export ready",
                message: "Saved \(fileURL.lastPathComponent) in the PacePilot documents folder.",
                destinationURL: nil
            )
        } catch {
            actionResult = StravaActionResult(title: "Calendar export unavailable", message: error.localizedDescription, destinationURL: nil)
        }
    }

    private func signOut() {
        Task {
            do {
                try await supabaseService().signOut()
            } catch {
                // Local session state is still cleared so a stale client session cannot keep the app unlocked.
            }

            appState.signOutLocally()
        }
    }

    private func supabaseService() -> SupabaseService {
        SupabaseService(
            configuration: SupabaseConfiguration(
                url: environment.supabaseURL,
                anonKey: environment.supabaseAnonKey
            )
        )
    }
}

private enum ProfileActionError: LocalizedError {
    case exportFailed

    var errorDescription: String? {
        "PacePilot could not save the calendar export on this device."
    }
}

struct ConnectedServiceCard: View {
    let title: String
    let status: ConnectedServiceStatus
    let warning: String
    let connectTitle: String
    let cacheActionTitle: String
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
                Button(cacheActionTitle, action: onDeleteCache)
            }
            .font(PPTypography.caption)
        }
    }
}
