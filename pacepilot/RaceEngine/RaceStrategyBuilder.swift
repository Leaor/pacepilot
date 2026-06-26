import Foundation

enum RaceStrategyBuilder {
    static func build(event: RaceEvent?, goalTimeSeconds: TimeInterval, pacingStyle: RacePacingStyle, units: Units) -> RaceStrategy {
        let distanceKilometers = event?.distanceKilometers ?? 10
        let splitCount = units == .kilometers ? Int(ceil(distanceKilometers)) : Int(ceil(distanceKilometers / 1.60934))
        let basePace = Int(goalTimeSeconds / Double(splitCount))
        let splits = (1...max(splitCount, 1)).map { index in
            RaceSplit(
                index: index,
                distanceLabel: units == .kilometers ? "Km \(index)" : "Mile \(index)",
                targetPaceSeconds: adjustedPace(basePace: basePace, index: index, total: splitCount, style: pacingStyle),
                cue: cue(index: index, total: splitCount, style: pacingStyle)
            )
        }

        return RaceStrategy(
            id: UUID(),
            eventID: event?.id,
            goalTimeSeconds: goalTimeSeconds,
            pacingStyle: pacingStyle,
            splitUnit: units,
            splits: splits,
            warmupPlan: "10-15 minutes easy, light drills, and two relaxed strides.",
            fuelingReminders: distanceKilometers >= 21 ? ["Gel 10 minutes before start", "Fuel every 35-40 minutes"] : ["Top off carbs 2-3 hours before start"],
            hydrationReminders: ["Sip early if warm", "Use aid stations calmly"],
            backupPlan: "If the first third feels harder than expected, settle 5-10 seconds slower per split and race by effort.",
            cautions: ["Weather and elevation estimates require final race-week review", "Estimate only, no guarantee"]
        )
    }

    private static func adjustedPace(basePace: Int, index: Int, total: Int, style: RacePacingStyle) -> Int {
        switch style {
        case .even, .rollingTerrain:
            return basePace
        case .negativeSplit:
            return index < total / 2 ? basePace + 3 : max(basePace - 3, 1)
        case .conservativeStart:
            return index <= 2 ? basePace + 6 : max(basePace - 2, 1)
        }
    }

    private static func cue(index: Int, total: Int, style: RacePacingStyle) -> String {
        if index == 1 { return "Start calm and stay boxed into the plan." }
        if index == total { return "Commit to form and finish with what is left." }
        if style == .negativeSplit && index > total / 2 { return "Begin pressing gradually." }
        return "Check breathing, posture, and effort."
    }
}
