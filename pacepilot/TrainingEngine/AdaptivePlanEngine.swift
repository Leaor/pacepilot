import Foundation

enum AdaptivePlanEngine {
    static func suggestion(
        missedWorkouts: Int,
        extraMileage: Double,
        fatigue: Int,
        injuryCaution: Bool,
        addedRace: RaceEvent?
    ) -> String {
        if injuryCaution || fatigue >= 4 {
            return "Reduce the next hard workout to easy running and add mobility."
        }
        if missedWorkouts >= 2 {
            return "Rebuild this week around the long run and one easy run. Do not cram missed volume."
        }
        if missedWorkouts == 1 {
            return "Move it only if it keeps a rest day before the next hard session; otherwise skip."
        }
        if extraMileage > 8 {
            return "Hold the next run easy and cap weekly load to avoid a spike."
        }
        if addedRace != nil {
            return "Treat the race as this week’s quality session and remove one hard workout."
        }
        return "Maintain the current plan."
    }
}
