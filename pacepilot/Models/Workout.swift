import Foundation

enum WorkoutStatus: String, Codable, CaseIterable {
    case planned
    case completed
    case skipped
    case missed
    case moved
}

struct PaceRange: Codable, Hashable {
    var lowerSecondsPerKilometer: Int
    var upperSecondsPerKilometer: Int

    var formatted: String {
        "\(Self.format(lowerSecondsPerKilometer))/km - \(Self.format(upperSecondsPerKilometer))/km"
    }

    static func format(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let remaining = seconds % 60
        return "\(minutes):\(String(format: "%02d", remaining))"
    }
}

struct WorkoutStep: Identifiable, Codable, Hashable {
    var id = UUID()
    var title: String
    var detail: String
    var durationMinutes: Int?
    var distanceKilometers: Double?
}

struct Workout: Identifiable, Codable, Hashable {
    var id: UUID
    var scheduledDate: Date
    var title: String
    var type: WorkoutType
    var status: WorkoutStatus
    var distanceKilometers: Double?
    var durationMinutes: Int?
    var targetPace: PaceRange?
    var purpose: String
    var notes: String
    var steps: [WorkoutStep]
    var isLongRun: Bool { type == .longRun }
    var isHard: Bool { [.tempoRun, .intervals, .hills, .racePace, .race].contains(type) }
}
