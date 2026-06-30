import Foundation
import SwiftUI

private enum SupportTopic: String, CaseIterable, Identifiable {
    case billingAndSubscriptions = "Billing and subscriptions"
    case trainingPlanQuestions = "Training plan questions"
    case dataExportOrDeletion = "Data export or deletion"
    case aiCoachDataUse = "AI Coach data use"
    case raceImportCorrections = "Race import corrections"
    case bugReport = "Bug report"

    var id: String { rawValue }
}

private struct SupportActionResult: Identifiable, Hashable {
    let id = UUID()
    var title: String
    var message: String
    var succeeded = false
}

private struct SupportRequestPayload: Encodable {
    var user_id: String
    var topic: String
    var message: String
}

private enum SupportRequestServiceError: LocalizedError {
    case missingSupabaseConfiguration
    case authenticationRequired
    case invalidURL
    case invalidResponse
    case messageTooShort
    case messageTooLong
    case submissionFailed

    var errorDescription: String? {
        switch self {
        case .missingSupabaseConfiguration:
            "Support requests need account services before they can be submitted here."
        case .authenticationRequired:
            "Sign in to submit a support request."
        case .invalidURL:
            "Account services are not configured correctly for support requests."
        case .invalidResponse:
            "The support request returned an unreadable response."
        case .messageTooShort:
            "Add a brief description so support can help."
        case .messageTooLong:
            "Keep support requests under 2,000 characters."
        case .submissionFailed:
            "Could not submit support request. Please try again or email support@pacepilot.app."
        }
    }
}

private struct SupportRequestService {
    var supabase: SupabaseService

    private let minimumMessageLength = 12
    private let maximumMessageLength = 2_000

    func submit(topic: SupportTopic, message: String) async -> SupportActionResult {
        do {
            try await submitRequest(topic: topic, message: message)
            return SupportActionResult(
                title: "Support request submitted",
                message: "PacePilot support can review it with your signed-in account.",
                succeeded: true
            )
        } catch {
            return SupportActionResult(title: "Support request unavailable", message: error.localizedDescription)
        }
    }

    private func submitRequest(topic: SupportTopic, message: String) async throws {
        guard supabase.isConfigured() else {
            throw SupportRequestServiceError.missingSupabaseConfiguration
        }

        let normalizedMessage = normalizeSupportMessage(message)
        guard normalizedMessage.count >= minimumMessageLength else {
            throw SupportRequestServiceError.messageTooShort
        }
        guard normalizedMessage.count <= maximumMessageLength else {
            throw SupportRequestServiceError.messageTooLong
        }

        let session: AuthenticatedSupabaseSession
        do {
            session = try await supabase.authenticatedSession()
        } catch SupabaseServiceError.authenticationRequired {
            throw SupportRequestServiceError.authenticationRequired
        } catch SupabaseServiceError.missingConfiguration {
            throw SupportRequestServiceError.missingSupabaseConfiguration
        } catch {
            throw error
        }

        guard let url = supabase.configuration.restTableURL(for: .supportRequests) else {
            throw SupportRequestServiceError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.setValue(supabase.configuration.normalizedAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(
            SupportRequestPayload(
                user_id: session.userId,
                topic: topic.rawValue,
                message: normalizedMessage
            )
        )

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SupportRequestServiceError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw SupportRequestServiceError.submissionFailed
        }
    }
}

private func normalizeSupportMessage(_ message: String) -> String {
    message
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .components(separatedBy: .whitespacesAndNewlines)
        .filter { !$0.isEmpty }
        .joined(separator: " ")
}

struct SupportView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.appEnvironment) private var environment
    @State private var topic: SupportTopic = .trainingPlanQuestions
    @State private var message = ""
    @State private var isSubmitting = false
    @State private var actionResult: SupportActionResult?

    var body: some View {
        List {
            Section("Training FAQ") {
                DisclosureGroup("Can PacePilot replace a coach?") {
                    Text("PacePilot provides training guidance and estimates. It does not provide medical advice or guarantees.")
                }
                DisclosureGroup("Why are easy runs easy?") {
                    Text("Most running stays easy so the hard work can be productive and recoverable.")
                }
            }

            Section("Account support") {
                Text("Requests are saved to your signed-in PacePilot account. If you cannot sign in, email support instead.")
                    .foregroundStyle(PPColors.textMuted)

                Picker("Topic", selection: $topic) {
                    ForEach(SupportTopic.allCases) { topic in
                        Text(topic.rawValue).tag(topic)
                    }
                }

                TextField(
                    "Describe what happened, what you expected, and any account detail that helps.",
                    text: $message,
                    axis: .vertical
                )
                .lineLimit(5...9)
                .textInputAutocapitalization(.sentences)

                Button(isSubmitting ? "Submitting..." : "Submit request") {
                    submitSupportRequest()
                }
                .disabled(isSubmitting)

                Button("Email support") {
                    openMail(subject: "PacePilot support: \(topic.rawValue)", body: message)
                }
            }

            Section("Privacy requests") {
                NavigationLink("Data deletion request") { DeleteMyDataView() }
                NavigationLink("Export data") { ExportMyDataView() }
            }

            Section("Legal") {
                NavigationLink("Health Disclaimer") { LegalDocumentView(document: .health) }
                NavigationLink("Terms of Service") { LegalDocumentView(document: .terms) }
                NavigationLink("Privacy Policy") { LegalDocumentView(document: .privacy) }
                NavigationLink("Subscription Terms") { LegalDocumentView(document: .subscriptions) }
                NavigationLink("Data Deletion Policy") { LegalDocumentView(document: .deletion) }
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Support")
        .alert(actionResult?.title ?? "Support", isPresented: Binding(get: { actionResult != nil }, set: { if !$0 { actionResult = nil } })) {
            Button("OK") { actionResult = nil }
        } message: {
            Text(actionResult?.message ?? "")
        }
    }

    private func submitSupportRequest() {
        guard !isSubmitting else {
            return
        }

        isSubmitting = true
        Task {
            let result = await SupportRequestService(supabase: supabaseService()).submit(topic: topic, message: message)
            isSubmitting = false
            actionResult = result
            if result.succeeded {
                message = ""
            }
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

    private func openMail(subject: String, body: String = "") {
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = "support@pacepilot.app"
        components.queryItems = [
            URLQueryItem(name: "subject", value: subject),
            URLQueryItem(name: "body", value: body.trimmingCharacters(in: .whitespacesAndNewlines))
        ]

        if let url = components.url {
            openURL(url)
        }
    }
}
