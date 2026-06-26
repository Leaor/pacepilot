import XCTest
@testable import PacePilot

final class RaceReadinessTests: XCTestCase {
    func testRaceReadinessScoreClampsAndExplains() {
        let score = RaceReadinessEngine.score(planAdherence: 1.2, fatigue: 1, longRunProgress: 1.1, daysToRace: 10)

        XCTAssertLessThanOrEqual(score.score, 100)
        XCTAssertEqual(score.explanations.count, 3)
        XCTAssertFalse(score.recommendedNextAction.isEmpty)
    }

    func testHighFatigueReducesReadiness() {
        let fresh = RaceReadinessEngine.score(planAdherence: 0.8, fatigue: 1, longRunProgress: 0.8, daysToRace: 30)
        let tired = RaceReadinessEngine.score(planAdherence: 0.8, fatigue: 5, longRunProgress: 0.8, daysToRace: 30)

        XCTAssertLessThan(tired.score, fresh.score)
    }
}
