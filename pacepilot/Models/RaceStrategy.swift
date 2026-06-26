import Foundation

enum RacePacingStyle: String, Codable, CaseIterable, Identifiable {
    case even
    case negativeSplit
    case conservativeStart
    case rollingTerrain

    var id: String { rawValue }
    var title: String {
        switch self {
        case .even: "Even"
        case .negativeSplit: "Negative split"
        case .conservativeStart: "Conservative start"
        case .rollingTerrain: "Rolling terrain"
        }
    }
}

struct RaceSplit: Identifiable, Codable, Hashable {
    var id = UUID()
    var index: Int
    var distanceLabel: String
    var targetPaceSeconds: Int
    var cue: String
}

struct RaceStrategy: Identifiable, Codable, Hashable {
    var id: UUID
    var eventID: UUID?
    var goalTimeSeconds: TimeInterval
    var pacingStyle: RacePacingStyle
    var splitUnit: Units
    var splits: [RaceSplit]
    var warmupPlan: String
    var fuelingReminders: [String]
    var hydrationReminders: [String]
    var backupPlan: String
    var cautions: [String]
}
