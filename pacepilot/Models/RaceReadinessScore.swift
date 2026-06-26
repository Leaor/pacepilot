import Foundation

enum RaceReadinessLabel: String, Codable, CaseIterable {
    case needsRecovery
    case building
    case onTrack
    case raceReady
    case taperSmart

    var title: String {
        switch self {
        case .needsRecovery: "Needs recovery"
        case .building: "Building"
        case .onTrack: "On track"
        case .raceReady: "Race ready"
        case .taperSmart: "Taper smart"
        }
    }
}

struct ReadinessExplanation: Identifiable, Codable, Hashable {
    var id = UUID()
    var title: String
    var detail: String
}

struct RaceReadinessScore: Identifiable, Codable, Hashable {
    var id: UUID
    var score: Int
    var label: RaceReadinessLabel
    var explanations: [ReadinessExplanation]
    var recommendedNextAction: String
    var generatedAt: Date
}
