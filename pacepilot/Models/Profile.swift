import Foundation

enum Units: String, Codable, CaseIterable, Identifiable {
    case kilometers
    case miles

    var id: String { rawValue }
    var label: String { self == .kilometers ? "km" : "miles" }
}

enum ExperienceLevel: String, Codable, CaseIterable, Identifiable {
    case new
    case casual
    case intermediate
    case advanced
    case elite

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

enum TrainingGoal: String, Codable, CaseIterable, Identifiable {
    case first5K
    case faster5K
    case tenK
    case halfMarathon
    case marathon
    case ultra
    case maintainFitness
    case returnFromInjury

    var id: String { rawValue }

    var title: String {
        switch self {
        case .first5K: "First 5K"
        case .faster5K: "Faster 5K"
        case .tenK: "10K"
        case .halfMarathon: "Half marathon"
        case .marathon: "Marathon"
        case .ultra: "Ultra"
        case .maintainFitness: "Maintain fitness"
        case .returnFromInjury: "Return from injury"
        }
    }

    var raceDistanceKilometers: Double {
        switch self {
        case .first5K, .faster5K: 5
        case .tenK: 10
        case .halfMarathon: 21.0975
        case .marathon: 42.195
        case .ultra: 50
        case .maintainFitness, .returnFromInjury: 10
        }
    }
}

enum CoachingTone: String, Codable, CaseIterable, Identifiable {
    case calm
    case direct
    case encouraging
    case analytical

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

struct RunnerProfile: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var email: String
    var ageRange: String
    var timezone: String
    var units: Units
    var experience: ExperienceLevel
    var currentWeeklyMileage: Double
    var longestRecentRun: Double
    var goal: TrainingGoal
    var raceDate: Date
    var goalTimeSeconds: TimeInterval?
    var availableRunDays: [Weekday]
    var preferredLongRunDay: Weekday
    var strengthPreference: StrengthPreference
    var equipment: EquipmentPreference
    var injuryCaution: Bool
    var coachingTone: CoachingTone

    static let demo = RunnerProfile(
        id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!,
        name: "Michael",
        email: "michael@example.com",
        ageRange: "35-44",
        timezone: "America/Toronto",
        units: .kilometers,
        experience: .intermediate,
        currentWeeklyMileage: 34,
        longestRecentRun: 14,
        goal: .tenK,
        raceDate: Calendar.current.date(byAdding: .day, value: 62, to: .now) ?? .now,
        goalTimeSeconds: 47 * 60,
        availableRunDays: [.monday, .tuesday, .thursday, .saturday, .sunday],
        preferredLongRunDay: .sunday,
        strengthPreference: .twoDays,
        equipment: .dumbbells,
        injuryCaution: false,
        coachingTone: .encouraging
    )
}

enum Weekday: Int, Codable, CaseIterable, Identifiable {
    case sunday = 1
    case monday
    case tuesday
    case wednesday
    case thursday
    case friday
    case saturday

    var id: Int { rawValue }
    var shortTitle: String {
        switch self {
        case .sunday: "Sun"
        case .monday: "Mon"
        case .tuesday: "Tue"
        case .wednesday: "Wed"
        case .thursday: "Thu"
        case .friday: "Fri"
        case .saturday: "Sat"
        }
    }
}

enum StrengthPreference: String, Codable, CaseIterable, Identifiable {
    case none
    case oneDay
    case twoDays

    var id: String { rawValue }
    var title: String {
        switch self {
        case .none: "None"
        case .oneDay: "1 day"
        case .twoDays: "2 days"
        }
    }
}

enum EquipmentPreference: String, Codable, CaseIterable, Identifiable {
    case none
    case dumbbells
    case fullGym

    var id: String { rawValue }
    var title: String {
        switch self {
        case .none: "None"
        case .dumbbells: "Dumbbells"
        case .fullGym: "Full gym"
        }
    }
}
