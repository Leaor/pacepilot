import Foundation

enum WeekPhase: String, Codable, CaseIterable {
    case base
    case build
    case recovery
    case deload
    case taper
    case race

    var title: String { rawValue.capitalized }
}

struct TrainingPlan: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var goal: TrainingGoal
    var raceDate: Date
    var createdAt: Date
    var weeks: [TrainingWeek]
    var paceZones: PaceZones
    var aRace: RaceEvent?
    var bRace: RaceEvent?

    var currentWeek: TrainingWeek? {
        weeks.first { week in
            week.startDate <= .now && week.endDate >= .now
        } ?? weeks.first
    }

    mutating func updateWorkout(_ id: UUID, status: WorkoutStatus) {
        for weekIndex in weeks.indices {
            guard let workoutIndex = weeks[weekIndex].workouts.firstIndex(where: { $0.id == id }) else {
                continue
            }
            weeks[weekIndex].workouts[workoutIndex].status = status
            return
        }
    }
}

struct TrainingWeek: Identifiable, Codable, Hashable {
    var id: UUID
    var number: Int
    var startDate: Date
    var endDate: Date
    var phase: WeekPhase
    var targetDistanceKilometers: Double
    var workouts: [Workout]
    var focus: String
}
