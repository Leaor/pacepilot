import Foundation
import SwiftUI

struct CoachView: View {
    @Environment(\.appEnvironment) private var environment
    @EnvironmentObject private var appState: AppState
    @State private var message = ""
    @State private var isTyping = false
    @State private var errorMessage: String?
    @State private var thread: AIChatThread = CoachView.emptyThread()
    @State private var actionResult: CoachActionResult?

    private let prompts = [
        "Adjust my week",
        "Explain today’s workout",
        "Analyze my last PacePilot run",
        "Am I race ready?",
        "Help me pace my 10K",
        "I missed two runs",
        "Make race checklist",
        "What does my fatigue score mean?",
        "Which shoes am I using most?",
        "Summarize my progress this month",
        "Why is Strava excluded?"
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                privacyNotice
                ScrollView {
                    VStack(alignment: .leading, spacing: PPSpacing.md) {
                        promptChips
                        ForEach(thread.messages) { chatMessage in
                            messageBubble(chatMessage)
                        }
                        if isTyping {
                            PPBadge(title: "PacePilot is thinking", color: PPColors.aiCyan, systemImage: "ellipsis.bubble")
                        }
                        if let errorMessage {
                            Text(errorMessage)
                                .foregroundStyle(PPColors.error)
                        }
                    }
                    .padding(PPSpacing.md)
                }
                .ppTabSafeAreaPadding()
                composer
            }
            .ppScreen()
            .navigationTitle("Coach")
            .onAppear(perform: syncThreadForSession)
            .onChange(of: appState.isDemoMode) { _, _ in syncThreadForSession() }
            .onChange(of: appState.aiThreads) { _, _ in syncThreadForSession() }
            .toolbar {
                Menu {
                    Button("Regenerate") { regenerate() }
                    Button("Clear chat") { clearChat() }
                    Button("Export chat") { exportChat() }
                    Button("Delete chat", role: .destructive) { clearChat() }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
            .alert(actionResult?.title ?? "Coach", isPresented: Binding(get: { actionResult != nil }, set: { if !$0 { actionResult = nil } })) {
                Button("OK") { actionResult = nil }
            } message: {
                Text(actionResult?.message ?? "")
            }
        }
    }

    private var privacyNotice: some View {
        VStack(alignment: .leading, spacing: PPSpacing.xs) {
            Text("PacePilot AI uses approved PacePilot data, consented imports, and what you type here. Strava API/cache data stays display-only.")
                .font(PPTypography.caption)
                .foregroundStyle(PPColors.textMuted)
            HStack {
                PPSourceChip(title: "PacePilot allowed", isAllowed: appState.privacy.aiCanUsePacePilotActivityHistory)
                PPSourceChip(title: "Strava excluded", isAllowed: false)
                if appState.privacy.aiCanUseGarminData {
                    PPSourceChip(title: "Garmin allowed", isAllowed: true)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(PPSpacing.md)
        .background(PPColors.surfaceNavy)
    }

    private var promptChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(prompts, id: \.self) { prompt in
                    Button(prompt) {
                        message = prompt
                        send()
                    }
                    .font(PPTypography.caption)
                    .lineLimit(1)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(PPColors.surfaceLight)
                    .clipShape(Capsule())
                }
            }
        }
    }

    private func messageBubble(_ chatMessage: AIChatMessage) -> some View {
        VStack(alignment: chatMessage.role == .user ? .trailing : .leading, spacing: PPSpacing.xs) {
            Text(chatMessage.text)
                .padding(PPSpacing.md)
                .background(chatMessage.role == .user ? PPColors.orange : PPColors.surfaceNavy)
                .foregroundStyle(PPColors.textWhite)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            if !chatMessage.usedSources.isEmpty || !chatMessage.excludedSources.isEmpty {
                Text(sourceSummary(for: chatMessage))
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: chatMessage.role == .user ? .trailing : .leading)
    }

    private var composer: some View {
        HStack(spacing: PPSpacing.sm) {
            TextField("Ask Coach", text: $message, axis: .vertical)
                .lineLimit(1...4)
                .submitLabel(.send)
                .onSubmit(send)
                .padding(.horizontal, PPSpacing.md)
                .padding(.vertical, 12)
                .background(PPColors.surfaceLight)
                .foregroundStyle(PPColors.textWhite)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(PPColors.surfaceRaised, lineWidth: 1)
                )
            Button {
                send()
            } label: {
                Image(systemName: "paperplane.fill")
                    .frame(width: 44, height: 44)
                    .background(PPColors.orange)
                    .foregroundStyle(PPColors.textWhite)
                    .clipShape(Circle())
            }
            .disabled(message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .opacity(message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.55 : 1)
        }
        .padding(PPSpacing.md)
        .padding(.bottom, PPSpacing.md)
        .background(PPColors.backgroundNavy)
    }

    private func sourceSummary(for chatMessage: AIChatMessage) -> String {
        var parts: [String] = []

        if !chatMessage.usedSources.isEmpty {
            parts.append("Used \(readableSources(chatMessage.usedSources))")
        }

        if !chatMessage.excludedSources.isEmpty {
            parts.append("Excluded \(readableSources(chatMessage.excludedSources))")
        }

        return parts.joined(separator: " · ")
    }

    private func readableSources(_ sources: [String]) -> String {
        sources
            .map { source in
                source
                    .replacingOccurrences(of: "activities:", with: "")
                    .replacingOccurrences(of: "_", with: " ")
                    .capitalized
            }
            .joined(separator: ", ")
    }

    private func send() {
        let text = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        message = ""
        errorMessage = nil
        let user = AIChatMessage(id: UUID(), role: .user, text: text, createdAt: .now, usedSources: [], excludedSources: [])
        thread.messages.append(user)
        persistThreadLocally()
        isTyping = true

        let policy = AIDataPolicy.filter(activitySources: appState.activities.map(\.source), privacy: appState.privacy)
        let configuration = SupabaseConfiguration(
            url: environment.supabaseURL,
            anonKey: environment.supabaseAnonKey
        )
        let service = OpenAIProxyService(
            supabase: SupabaseService(configuration: configuration),
            environment: environment
        )
        let request = OpenAIProxyRequest(
            threadID: thread.id,
            message: text,
            allowedSources: policy.allowedSources.map(\.rawValue),
            excludedSources: policy.excludedSources.map(\.rawValue),
            profileSummary: "\(appState.profile.goal.title), \(appState.profile.experience.title), \(appState.profile.currentWeeklyMileage) km/week"
        )

        Task {
            do {
                let answer = try await service.sendChat(request)
                thread.messages.append(answer)
                persistThreadLocally()
            } catch {
                errorMessage = error.localizedDescription
                if shouldShowConservativeFallback(for: error) {
                    let fallback = AIChatMessage(
                        id: UUID(),
                        role: .assistant,
                        text: AISafetyGuards.sanitized("I could not reach PacePilot Coach right now. Keep the adjustment conservative: do not cram missed work, keep easy days easy, and resume from the next planned session."),
                        createdAt: .now,
                        usedSources: policy.allowedSources.map(\.rawValue),
                        excludedSources: policy.excludedSources.map(\.rawValue)
                    )
                    thread.messages.append(fallback)
                    persistThreadLocally()
                }
            }
            isTyping = false
        }
    }

    private func shouldShowConservativeFallback(for error: Error) -> Bool {
        guard let proxyError = error as? OpenAIProxyError else {
            return true
        }

        switch proxyError {
        case .featureDisabled, .missingConfiguration:
            return false
        case .invalidURL, .invalidResponse, .edgeFunction:
            return true
        }
    }

    private func regenerate() {
        guard let lastUser = thread.messages.last(where: { $0.role == .user }) else { return }
        message = lastUser.text
        send()
    }

    private func clearChat() {
        thread = Self.emptyThread()
        appState.aiThreads.removeAll()
    }

    private func syncThreadForSession() {
        if appState.isDemoMode, let previewThread = appState.aiThreads.first {
            thread = previewThread
            return
        }

        if let accountThread = appState.aiThreads.first {
            thread = accountThread
            return
        }

        if !thread.messages.isEmpty {
            thread = Self.emptyThread()
        }
    }

    private func persistThreadLocally() {
        thread.updatedAt = .now
        appState.aiThreads.removeAll { $0.id == thread.id }
        if !thread.messages.isEmpty {
            appState.aiThreads.insert(thread, at: 0)
        }
    }

    private static func emptyThread() -> AIChatThread {
        AIChatThread(id: UUID(), title: "New chat", messages: [], updatedAt: .now)
    }

    private func exportChat() {
        do {
            guard !thread.messages.isEmpty else {
                actionResult = CoachActionResult(title: "No chat to export", message: "This coach thread does not contain any messages.")
                return
            }

            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let data = try encoder.encode(thread)
            guard let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
                throw CoachActionError.exportFailed
            }

            let fileURL = directory.appendingPathComponent("pacepilot-coach-chat-\(thread.id.uuidString).json")
            try data.write(to: fileURL, options: .atomic)
            actionResult = CoachActionResult(title: "Chat export ready", message: "Saved \(fileURL.lastPathComponent) in the PacePilot documents folder.")
        } catch {
            actionResult = CoachActionResult(title: "Chat export unavailable", message: error.localizedDescription)
        }
    }
}

private struct CoachActionResult: Identifiable, Hashable {
    let id = UUID()
    var title: String
    var message: String
}

private enum CoachActionError: LocalizedError {
    case exportFailed

    var errorDescription: String? {
        "PacePilot could not save the chat export on this device."
    }
}
