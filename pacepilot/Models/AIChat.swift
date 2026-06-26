import Foundation

enum AIMessageRole: String, Codable {
    case user
    case assistant
    case system
}

struct AIChatMessage: Identifiable, Codable, Hashable {
    var id: UUID
    var role: AIMessageRole
    var text: String
    var createdAt: Date
    var usedSources: [String]
    var excludedSources: [String]
}

struct AIChatThread: Identifiable, Codable, Hashable {
    var id: UUID
    var title: String
    var messages: [AIChatMessage]
    var updatedAt: Date
}
