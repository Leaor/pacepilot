import SwiftUI

enum WorkoutType: String, Codable, CaseIterable, Identifiable {
    case easyRun
    case recoveryRun
    case longRun
    case tempoRun
    case intervals
    case hills
    case racePace
    case strides
    case tuneUpRace
    case strength
    case mobility
    case rest
    case race

    var id: String { rawValue }

    var title: String {
        switch self {
        case .easyRun: "Easy Run"
        case .recoveryRun: "Recovery Run"
        case .longRun: "Long Run"
        case .tempoRun: "Tempo"
        case .intervals: "Intervals"
        case .hills: "Hills"
        case .racePace: "Race Pace"
        case .strides: "Strides"
        case .tuneUpRace: "Tune-up Race"
        case .strength: "Strength"
        case .mobility: "Mobility"
        case .rest: "Rest"
        case .race: "Race"
        }
    }

    var symbolName: String {
        switch self {
        case .easyRun: "leaf.fill"
        case .recoveryRun: "heart.fill"
        case .longRun: "map.fill"
        case .tempoRun: "metronome.fill"
        case .intervals: "bolt.fill"
        case .hills: "mountain.2.fill"
        case .racePace: "speedometer"
        case .strides: "wind"
        case .tuneUpRace, .race: "flag.checkered"
        case .strength: "dumbbell.fill"
        case .mobility: "figure.cooldown"
        case .rest: "moon.fill"
        }
    }

    var color: Color {
        switch self {
        case .easyRun, .recoveryRun: PPColors.easyGreen
        case .longRun: PPColors.longRunPurple
        case .tempoRun, .racePace, .race, .tuneUpRace: PPColors.raceOrange
        case .intervals, .hills, .strides: PPColors.aiCyan
        case .strength, .mobility: PPColors.warning
        case .rest: PPColors.textMuted
        }
    }
}

struct RecentRaceResult: Codable, Hashable {
    var distanceKilometers: Double
    var timeSeconds: TimeInterval
    var source: ActivitySource
}

struct PlanInput: Codable, Hashable {
    var goal: TrainingGoal
    var raceDate: Date
    var goalTimeSeconds: TimeInterval?
    var currentWeeklyMileage: Double
    var trainingDaysPerWeek: Int
    var availableRunDays: [Weekday]
    var experienceLevel: ExperienceLevel
    var recentRaceResult: RecentRaceResult?
    var injuryCaution: Bool
    var strengthPreference: StrengthPreference
    var preferredLongRunDay: Weekday
}
