import Foundation

enum PromptBuilder {
    static func coachPrompt(profile: RunnerProfile, question: String, policy: AIDataPolicyResult) -> [String: String] {
        [
            "system": "You are PacePilot AI. Use only approved PacePilot data, avoid medical advice, and keep recommendations safe.",
            "user": question,
            "profile": "\(profile.goal.title), \(profile.experience.title), timezone \(profile.timezone)",
            "allowed_sources": policy.allowedSources.map(\.rawValue).joined(separator: ","),
            "excluded_sources": policy.excludedSources.map(\.rawValue).joined(separator: ",")
        ]
    }
}
