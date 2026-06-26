import Foundation

enum RaceReadinessEngine {
    static func score(planAdherence: Double, fatigue: Int, longRunProgress: Double, daysToRace: Int) -> RaceReadinessScore {
        var score = Int(planAdherence * 42 + longRunProgress * 34 + 24)
        score -= max(fatigue - 2, 0) * 8
        if daysToRace <= 14 { score += 4 }
        score = min(max(score, 0), 100)

        let label: RaceReadinessLabel
        switch score {
        case 0..<45: label = .needsRecovery
        case 45..<65: label = .building
        case 65..<80: label = .onTrack
        case 80..<92: label = .raceReady
        default: label = .taperSmart
        }

        return RaceReadinessScore(
            id: UUID(),
            score: score,
            label: label,
            explanations: [
                ReadinessExplanation(title: "Consistency", detail: "Plan adherence is weighted but not treated as a guarantee."),
                ReadinessExplanation(title: "Endurance", detail: "Long-run progression supports the estimate."),
                ReadinessExplanation(title: "Freshness", detail: "Fatigue lowers the score to protect recovery.")
            ],
            recommendedNextAction: label == .needsRecovery ? "Take the next run easy or rest." : "Stay patient and protect the next key workout.",
            generatedAt: .now
        )
    }
}
