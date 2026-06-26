import SwiftUI

struct PrivacyCenterView: View {
    var body: some View {
        List {
            Section("Privacy Center") {
                NavigationLink("Data Overview") { DataOverviewView() }
                NavigationLink("AI Data Controls") { AIDataControlsView() }
                NavigationLink("Connected Services Data") { ConnectedServicesDataView() }
                NavigationLink("Export My Data") { ExportMyDataView() }
                NavigationLink("Delete My Data") { DeleteMyDataView() }
                NavigationLink("Privacy Settings") { PrivacySettingsView() }
            }
            Section("Legal") {
                NavigationLink("Terms of Service") { LegalDocumentView(document: .terms) }
                NavigationLink("Privacy Policy") { LegalDocumentView(document: .privacy) }
                NavigationLink("Subscription Terms") { LegalDocumentView(document: .subscriptions) }
                NavigationLink("Health Disclaimer") { LegalDocumentView(document: .health) }
                NavigationLink("Data Deletion Policy") { LegalDocumentView(document: .deletion) }
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Privacy Center")
    }
}

struct DataOverviewView: View {
    private let categories = [
        "Profile",
        "Onboarding",
        "Training plans",
        "Activities",
        "Check-ins",
        "Race goals",
        "Shoes",
        "AI chats",
        "Connected services",
        "Subscription status"
    ]

    var body: some View {
        List(categories, id: \.self) { category in
            Label(category, systemImage: "checkmark.shield.fill")
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Data Overview")
    }
}

struct AIDataControlsView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Form {
            Toggle("AI Coach on/off", isOn: $appState.privacy.aiCoachEnabled)
            Toggle("AI can use PacePilot activity history", isOn: $appState.privacy.aiCanUsePacePilotActivityHistory)
            Toggle("AI can use check-ins", isOn: $appState.privacy.aiCanUseCheckIns)
            Toggle("AI can use race goals", isOn: $appState.privacy.aiCanUseRaceGoals)
            Toggle("AI can use chat history", isOn: $appState.privacy.aiCanUseChatHistory)
            Toggle("AI can use user-provided imports", isOn: $appState.privacy.aiCanUseUserProvidedImports)
            Toggle("AI can use Garmin data if connected/permitted", isOn: $appState.privacy.aiCanUseGarminData)
            Toggle("AI can use Apple Health data if permitted", isOn: $appState.privacy.aiCanUseAppleHealthData)
            Section("Always excluded") {
                Label("Strava API and cached data are excluded from AI coaching.", systemImage: "nosign")
                    .foregroundStyle(PPColors.warning)
            }
            Section {
                Button("Clear AI chat history", role: .destructive) {
                    appState.aiThreads.removeAll()
                }
                Button("Export AI chat history") {}
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("AI Data Controls")
    }
}

struct ConnectedServicesDataView: View {
    @Environment(\.appEnvironment) private var environment
    @EnvironmentObject private var appState: AppState
    @State private var stravaResult: StravaActionResult?

    var body: some View {
        List {
            Section("Strava") {
                Text(StravaService().status(cachedActivities: appState.stravaActivities().count).message)
                Button("Disconnect Strava") {
                    Task {
                        stravaResult = await StravaService().disconnect(environment: environment)
                    }
                }
                Button("Delete cached Strava data", role: .destructive) {
                    Task {
                        let result = await StravaService().deleteCachedData(environment: environment)
                        appState.deleteStravaCache()
                        stravaResult = result
                    }
                }
                Text("Cache expiry is enforced by Edge Functions when Supabase is configured. Local display cache can be cleared immediately.")
                    .foregroundStyle(PPColors.textMuted)
                Label("Strava API/cache data is always excluded from PacePilot AI.", systemImage: "nosign")
                    .foregroundStyle(PPColors.warning)
            }
            Section("Garmin") {
                Text(GarminService(featureEnabled: false, mockMode: true).status().message)
                Button("Disconnect Garmin") {}
                Button("Delete cached Garmin data", role: .destructive) {}
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Connected Data")
        .alert(stravaResult?.title ?? "Strava", isPresented: Binding(get: { stravaResult != nil }, set: { if !$0 { stravaResult = nil } })) {
            Button("OK") { stravaResult = nil }
        } message: {
            Text(stravaResult?.message ?? "")
        }
    }
}

struct ExportMyDataView: View {
    private let exports = ["Full data export", "Profile", "Activities", "Plans", "AI chats", "Race strategies", "Shoes", "Check-ins"]

    var body: some View {
        List(exports, id: \.self) { item in
            Button("Request \(item)") {}
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Export My Data")
    }
}

struct DeleteMyDataView: View {
    private let deletes = ["Account", "Selected categories", "Activities", "AI chat history", "Connected-service cache", "Plans"]
    @State private var confirmation = false

    var body: some View {
        List {
            Section {
                Toggle("I understand dangerous actions require confirmation", isOn: $confirmation)
            }
            Section {
                ForEach(deletes, id: \.self) { item in
                    Button("Delete \(item)", role: .destructive) {}
                        .disabled(!confirmation)
                }
            }
            Section {
                Text("Deletion requests are logged in Supabase for auditability.")
                    .foregroundStyle(PPColors.textMuted)
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Delete My Data")
    }
}

struct PrivacySettingsView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Form {
            Toggle("Profile private", isOn: $appState.privacy.profilePrivate)
            Toggle("Activities private", isOn: $appState.privacy.activityPrivate)
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Privacy Settings")
    }
}

struct LegalSection: Hashable {
    let title: String
    let body: String
}

enum LegalDocument: CaseIterable {
    case terms
    case privacy
    case subscriptions
    case health
    case deletion

    var title: String {
        switch self {
        case .terms: "Terms of Service"
        case .privacy: "Privacy Policy"
        case .subscriptions: "Subscription Terms"
        case .health: "Health Disclaimer"
        case .deletion: "Data Deletion Policy"
        }
    }

    var sections: [LegalSection] {
        switch self {
        case .terms:
            [
                LegalSection(title: "Use of PacePilot", body: "PacePilot provides planning, logging, race preparation, and educational training guidance. You are responsible for using the app safely and for deciding whether a workout is appropriate for your current health and conditions."),
                LegalSection(title: "Accounts and Data", body: "Keep your account credentials secure. PacePilot stores account, plan, activity, privacy, subscription, and connected-service metadata to operate the app."),
                LegalSection(title: "Limitations", body: "Training predictions, readiness scores, race strategies, and AI responses are estimates. They do not guarantee performance or replace professional advice.")
            ]
        case .privacy:
            [
                LegalSection(title: "Data We Collect", body: "PacePilot may store profile details, onboarding answers, plans, workouts, activity logs, check-ins, shoes, race goals, AI chats, subscription status, and connected-service metadata."),
                LegalSection(title: "AI Data Controls", body: "AI coaching uses only categories you permit. Strava API and cached Strava data remain display-only and are excluded from AI coaching."),
                LegalSection(title: "Your Controls", body: "You can adjust privacy settings, export account data, request deletion, and clear connected-service cache from the Privacy Center.")
            ]
        case .subscriptions:
            [
                LegalSection(title: "Plans", body: "Free, Pro, and Elite tiers control access to training, race, integration, and AI features."),
                LegalSection(title: "Billing", body: "Paid subscriptions are intended to be managed through App Store and RevenueCat entitlement status. Trials, renewals, cancellations, refunds, and billing support follow the store provider's policies."),
                LegalSection(title: "Access Changes", body: "Feature access may change when a subscription expires, is cancelled, enters grace period, or cannot be verified.")
            ]
        case .health:
            [
                LegalSection(title: "Not Medical Advice", body: "PacePilot does not diagnose, treat, or prevent medical conditions. Training guidance is educational and should not override medical advice."),
                LegalSection(title: "Use Judgment", body: "Stop exercising and seek appropriate help if you experience chest pain, faintness, severe shortness of breath, sharp pain, or symptoms that concern you."),
                LegalSection(title: "Personal Risk", body: "Running and training involve risk. Adjust workouts for weather, terrain, illness, injury, fatigue, and your actual fitness.")
            ]
        case .deletion:
            [
                LegalSection(title: "Deletion Requests", body: "Account and data deletion requests are recorded for auditability and processed against PacePilot-owned data."),
                LegalSection(title: "Connected Services", body: "Disconnecting Strava or Garmin removes PacePilot's connection and cached display data where supported. It does not delete data from the third-party provider."),
                LegalSection(title: "Retention", body: "Some records may be retained when required for security, legal, billing, fraud prevention, or operational audit obligations.")
            ]
        }
    }
}

struct LegalDocumentView: View {
    let document: LegalDocument

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PPSpacing.lg) {
                Text(document.title)
                    .font(PPTypography.largeTitle)
                    .foregroundStyle(PPColors.textWhite)
                Text("Summary for in-app review. Final release language should be reviewed by qualified counsel.")
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)

                ForEach(document.sections, id: \.title) { section in
                    PPCard {
                        VStack(alignment: .leading, spacing: PPSpacing.sm) {
                            Text(section.title)
                                .font(PPTypography.headline)
                                .foregroundStyle(PPColors.textWhite)
                            Text(section.body)
                                .font(PPTypography.body)
                                .foregroundStyle(PPColors.textMuted)
                        }
                    }
                }
            }
            .padding(PPSpacing.md)
        }
        .ppTabSafeAreaPadding()
        .ppScreen()
        .navigationTitle(document.title)
    }
}
