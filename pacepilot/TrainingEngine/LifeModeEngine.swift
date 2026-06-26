import Foundation

enum LifeModeOption: String, CaseIterable, Identifiable {
    case missedWorkout
    case missedMultipleDays
    case onlyTwentyMinutes
    case tired
    case sick
    case legsSore
    case travelling
    case busyWeek
    case easierWeek
    case raceWeekend
    case moveLongRun
    case returningFromBreak

    var id: String { rawValue }

    var title: String {
        switch self {
        case .missedWorkout: "I missed a workout"
        case .missedMultipleDays: "I missed multiple days"
        case .onlyTwentyMinutes: "I only have 20 minutes"
        case .tired: "I am tired"
        case .sick: "I am sick"
        case .legsSore: "My legs are sore"
        case .travelling: "I am travelling"
        case .busyWeek: "I am busy this week"
        case .easierWeek: "I want an easier week"
        case .raceWeekend: "I want to race this weekend"
        case .moveLongRun: "I need to move my long run"
        case .returningFromBreak: "I am returning from a break"
        }
    }
}

struct LifeModeSuggestion: Identifiable, Hashable {
    var id = UUID()
    var action: String
    var detail: String
}

enum LifeModeEngine {
    static func suggestions(for option: LifeModeOption) -> [LifeModeSuggestion] {
        switch option {
        case .missedWorkout:
            return [LifeModeSuggestion(action: "Skip or move", detail: "Move only if it does not crowd the next quality day.")]
        case .missedMultipleDays:
            return [LifeModeSuggestion(action: "Rebuild week", detail: "Keep one easy run and the long run; drop extra intensity.")]
        case .onlyTwentyMinutes:
            return [LifeModeSuggestion(action: "Reduce", detail: "Run easy for 20 minutes and finish with mobility.")]
        case .tired, .sick, .legsSore:
            return [LifeModeSuggestion(action: "Rest or easy", detail: "Convert hard work to easy effort or rest if symptoms are elevated.")]
        case .travelling, .busyWeek:
            return [LifeModeSuggestion(action: "Condense", detail: "Use short easy runs and move the long run to the calmest day.")]
        case .easierWeek:
            return [LifeModeSuggestion(action: "Recover", detail: "Reduce weekly distance 15-25 percent and keep all running easy.")]
        case .raceWeekend:
            return [LifeModeSuggestion(action: "Swap", detail: "Use the race as the hard workout and add recovery after.")]
        case .moveLongRun:
            return [LifeModeSuggestion(action: "Move", detail: "Place the long run after an easy or rest day.")]
        case .returningFromBreak:
            return [LifeModeSuggestion(action: "Rebuild", detail: "Start with easy volume and avoid speed for the first week back.")]
        }
    }
}
