import Foundation

enum WeeklyAdjustmentEngine {
    static func nextWeekAdjustment(from checkIn: CheckIn) -> String {
        if checkIn.nextWeekPreference == .recover || checkIn.fatigue >= 4 || checkIn.soreness >= 4 {
            return "Recover: reduce volume by 20 percent and swap intensity for easy running."
        }
        if checkIn.nextWeekPreference == .push && checkIn.sleepHours >= 7 && checkIn.weekDifficulty <= 3 {
            return "Push gently: add one short aerobic extension, not extra intensity."
        }
        return "Maintain: keep the planned rhythm and protect the long run."
    }
}
