import Foundation
import SwiftUI

struct PrivacyActionResult: Identifiable, Hashable {
    let id = UUID()
    var title: String
    var message: String
}

private struct EdgeErrorResponse: Decodable {
    var error: String
}

private enum AccountDataServiceError: LocalizedError {
    case missingSupabaseConfiguration
    case invalidURL
    case invalidResponse
    case edgeFunction(String)
    case unableToSaveExport

    var errorDescription: String? {
        switch self {
        case .missingSupabaseConfiguration:
            "Add Supabase URL and anon key configuration before using account data requests."
        case .invalidURL:
            "The configured Supabase URL is invalid."
        case .invalidResponse:
            "The account data request returned an unreadable response."
        case .edgeFunction(let message):
            message
        case .unableToSaveExport:
            "PacePilot could not save the export file on this device."
        }
    }
}

private struct AccountDataService {
    var environment: AppEnvironment
    var supabase: SupabaseService

    func exportFullAccountData() async -> PrivacyActionResult {
        do {
            let data = try await callEdgeFunction("export-user-data", method: "GET")
            let fileURL = try writePrivacyExportData(data, prefix: "pacepilot-data-export")
            return PrivacyActionResult(
                title: "Export ready",
                message: "Saved \(fileURL.lastPathComponent) in the PacePilot documents folder."
            )
        } catch {
            return PrivacyActionResult(title: "Export unavailable", message: error.localizedDescription)
        }
    }

    func requestAccountDeletion() async -> PrivacyActionResult {
        do {
            _ = try await callEdgeFunction("delete-account-request", method: "POST")
            return PrivacyActionResult(
                title: "Deletion requested",
                message: "Your account deletion request was recorded for review and processing."
            )
        } catch {
            return PrivacyActionResult(title: "Deletion request unavailable", message: error.localizedDescription)
        }
    }

    private func callEdgeFunction(_ name: String, method: String) async throws -> Data {
        guard supabase.isConfigured() else {
            throw AccountDataServiceError.missingSupabaseConfiguration
        }
        guard let url = supabase.configuration.edgeFunctionURL(named: name) else {
            throw AccountDataServiceError.invalidURL
        }

        let accessToken = try await supabase.authenticatedAccessToken()
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(supabase.configuration.normalizedAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AccountDataServiceError.invalidResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let message = (try? JSONDecoder().decode(EdgeErrorResponse.self, from: data).error)
                ?? "Account data request returned \(httpResponse.statusCode)."
            throw AccountDataServiceError.edgeFunction(message)
        }

        return data
    }
}

private func writePrivacyExportData(_ data: Data, prefix: String) throws -> URL {
    guard let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
        throw AccountDataServiceError.unableToSaveExport
    }

    let fileURL = directory.appendingPathComponent("\(prefix)-\(privacyExportTimestamp()).json")
    try data.write(to: fileURL, options: .atomic)
    return fileURL
}

private func writePrivacyExport<T: Encodable>(_ value: T, prefix: String) throws -> URL {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    let data = try encoder.encode(value)
    return try writePrivacyExportData(data, prefix: prefix)
}

private func privacyExportTimestamp() -> String {
    ISO8601DateFormatter()
        .string(from: Date())
        .replacingOccurrences(of: ":", with: "-")
}

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
    @State private var actionResult: PrivacyActionResult?

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
                    actionResult = PrivacyActionResult(title: "AI history cleared", message: "AI chat history was cleared on this device.")
                }
                Button("Export AI chat history") {
                    exportAIChatHistory()
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("AI Data Controls")
        .alert(actionResult?.title ?? "AI Data", isPresented: Binding(get: { actionResult != nil }, set: { if !$0 { actionResult = nil } })) {
            Button("OK") { actionResult = nil }
        } message: {
            Text(actionResult?.message ?? "")
        }
    }

    private func exportAIChatHistory() {
        guard !appState.aiThreads.isEmpty else {
            actionResult = PrivacyActionResult(title: "No AI history", message: "There is no AI chat history to export on this device.")
            return
        }

        do {
            let fileURL = try writePrivacyExport(appState.aiThreads, prefix: "pacepilot-ai-chat-export")
            actionResult = PrivacyActionResult(title: "AI export ready", message: "Saved \(fileURL.lastPathComponent) in the PacePilot documents folder.")
        } catch {
            actionResult = PrivacyActionResult(title: "AI export unavailable", message: error.localizedDescription)
        }
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
                        stravaResult = await StravaService().disconnect(environment: environment, supabase: supabaseService())
                    }
                }
                Button("Disconnect and clear Strava cache", role: .destructive) {
                    Task {
                        let result = await StravaService().disconnectAndDeleteCachedData(environment: environment, supabase: supabaseService())
                        if result.succeeded {
                            appState.deleteStravaCache()
                        }
                        stravaResult = result
                    }
                }
                Text("Clearing Strava cache also disconnects Strava access. Local display cache is cleared only after the server request succeeds.")
                    .foregroundStyle(PPColors.textMuted)
                Label("Strava API/cache data is always excluded from PacePilot AI.", systemImage: "nosign")
                    .foregroundStyle(PPColors.warning)
            }
            Section("Garmin") {
                Text(GarminService(featureEnabled: environment.garminFeatureEnabled, mockMode: environment.mockGarmin).status().message)
                Button("Disconnect Garmin") {
                    stravaResult = StravaActionResult(
                        title: "Garmin unavailable",
                        message: GarminService(featureEnabled: environment.garminFeatureEnabled, mockMode: environment.mockGarmin).status().message,
                        destinationURL: nil
                    )
                }
                Button("Delete cached Garmin data", role: .destructive) {
                    stravaResult = StravaActionResult(
                        title: "Garmin cache unavailable",
                        message: "Garmin cache controls will be enabled after partner approval and server-side sync support.",
                        destinationURL: nil
                    )
                }
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

    private func supabaseService() -> SupabaseService {
        SupabaseService(
            configuration: SupabaseConfiguration(
                url: environment.supabaseURL,
                anonKey: environment.supabaseAnonKey
            )
        )
    }
}

struct ExportMyDataView: View {
    @Environment(\.appEnvironment) private var environment
    @State private var isExporting = false
    @State private var actionResult: PrivacyActionResult?

    private let includedCategories = ["Profile", "Privacy settings", "Subscriptions", "Training plans", "Workouts", "Activities", "Check-ins", "Race tools", "Shoes", "AI chats", "Connected-service metadata", "Export/deletion request logs"]

    var body: some View {
        List {
            Section("Full account export") {
                Text("Create a JSON export of PacePilot-owned account data. Connected-service tokens are redacted before export.")
                    .foregroundStyle(PPColors.textMuted)
                Button(isExporting ? "Preparing export..." : "Create full account export") {
                    requestExport()
                }
                .disabled(isExporting)
            }
            Section("Included data") {
                ForEach(includedCategories, id: \.self) { item in
                    Label(item, systemImage: "doc.text")
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Export My Data")
        .alert(actionResult?.title ?? "Export", isPresented: Binding(get: { actionResult != nil }, set: { if !$0 { actionResult = nil } })) {
            Button("OK") { actionResult = nil }
        } message: {
            Text(actionResult?.message ?? "")
        }
    }

    private func requestExport() {
        guard !isExporting else { return }
        isExporting = true

        Task {
            actionResult = await AccountDataService(environment: environment, supabase: supabaseService()).exportFullAccountData()
            isExporting = false
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

struct DeleteMyDataView: View {
    @Environment(\.appEnvironment) private var environment
    @EnvironmentObject private var appState: AppState
    @State private var confirmation = false
    @State private var isSubmitting = false
    @State private var actionResult: PrivacyActionResult?

    var body: some View {
        List {
            Section("Account deletion request") {
                Text("Request deletion of your PacePilot account and PacePilot-owned training data. Some billing, safety, legal, or abuse-prevention records may be retained where required.")
                    .foregroundStyle(PPColors.textMuted)
                Toggle("I understand dangerous actions require confirmation", isOn: $confirmation)
                Button(isSubmitting ? "Submitting request..." : "Request account deletion", role: .destructive) {
                    requestAccountDeletion()
                }
                .disabled(!confirmation || isSubmitting)
            }
            Section("Local clears") {
                Button("Clear AI chat history", role: .destructive) {
                    appState.aiThreads.removeAll()
                    actionResult = PrivacyActionResult(title: "AI history cleared", message: "AI chat history was cleared on this device.")
                }
                Button("Clear Strava display cache", role: .destructive) {
                    appState.deleteStravaCache()
                    actionResult = PrivacyActionResult(title: "Strava cache cleared", message: "Strava display cache was cleared on this device.")
                }
            }
            Section("Processing") {
                Text("Deletion requests are recorded for auditability and processed against PacePilot-owned data.")
                    .foregroundStyle(PPColors.textMuted)
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Delete My Data")
        .alert(actionResult?.title ?? "Delete My Data", isPresented: Binding(get: { actionResult != nil }, set: { if !$0 { actionResult = nil } })) {
            Button("OK") { actionResult = nil }
        } message: {
            Text(actionResult?.message ?? "")
        }
    }

    private func requestAccountDeletion() {
        guard confirmation, !isSubmitting else { return }
        isSubmitting = true

        Task {
            actionResult = await AccountDataService(environment: environment, supabase: supabaseService()).requestAccountDeletion()
            isSubmitting = false
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
