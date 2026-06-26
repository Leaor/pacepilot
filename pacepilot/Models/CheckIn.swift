import Foundation

enum WeeklyPreference: String, Codable, CaseIterable, Identifiable {
    case push
    case maintain
    case recover

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

struct CheckIn: Identifiable, Codable, Hashable {
    var id: UUID
    var date: Date
    var fatigue: Int
    var soreness: Int
    var sleepHours: Double
    var motivation: Int
    var weekDifficulty: Int
    var nextWeekPreference: WeeklyPreference
    var notes: String
}
