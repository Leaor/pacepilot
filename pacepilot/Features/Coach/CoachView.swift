import SwiftUI

struct CoachView: View {
    @Environment(\.appEnvironment) private var environment
    @EnvironmentObject private var appState: AppState
    @State private var message = ""
    @State private var isTyping = false
    @State private var errorMessage: String?
    @State private var thread: AIChatThread = PreviewData.demoAIThreads[0]

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
            .toolbar {
                Menu {
                    Button("Regenerate") { regenerate() }
                    Button("Clear chat") { thread.messages.removeAll() }
                    Button("Export chat") {}
                    Button("Delete chat", role: .destructive) { thread.messages.removeAll() }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
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
            } catch {
                errorMessage = error.localizedDescription
                let fallback = AIChatMessage(
                    id: UUID(),
                    role: .assistant,
                    text: AISafetyGuards.sanitized("I could not reach PacePilot Coach right now. Keep the adjustment conservative: do not cram missed work, keep easy days easy, and resume from the next planned session."),
                    createdAt: .now,
                    usedSources: policy.allowedSources.map(\.rawValue),
                    excludedSources: policy.excludedSources.map(\.rawValue)
                )
                thread.messages.append(fallback)
            }
            isTyping = false
        }
    }

    private func regenerate() {
        guard let lastUser = thread.messages.last(where: { $0.role == .user }) else { return }
        message = lastUser.text
        send()
    }
}
