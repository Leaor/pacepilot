import Foundation

enum TerrainTag: String, Codable, CaseIterable, Identifiable {
    case road
    case trail
    case track
    case mixed

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

enum EventVibe: String, Codable, CaseIterable, Identifiable {
    case fast
    case scenic
    case beginnerFriendly
    case charity
    case destination
    case localClassic

    var id: String { rawValue }
    var title: String {
        switch self {
        case .beginnerFriendly: "Beginner friendly"
        case .localClassic: "Local classic"
        default: rawValue.capitalized
        }
    }
}

struct RaceEvent: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var location: String
    var date: Date
    var distanceKilometers: Double
    var terrain: TerrainTag
    var elevationMeters: Double
    var vibe: EventVibe
    var registrationURL: URL?
    var isFeatured: Bool
}
