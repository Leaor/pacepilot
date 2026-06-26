import XCTest
@testable import PacePilot

final class PlanGeneratorTests: XCTestCase {
    func testPlanGeneratorCreatesRecoveryAndTaperWeeks() {
        let profile = RunnerProfile.demo
        let input = PlanInput(
            goal: profile.goal,
            raceDate: Calendar.current.date(byAdding: .day, value: 84, to: .now)!,
            goalTimeSeconds: profile.goalTimeSeconds,
            currentWeeklyMileage: profile.currentWeeklyMileage,
            trainingDaysPerWeek: profile.availableRunDays.count,
            availableRunDays: profile.availableRunDays,
            experienceLevel: profile.experience,
            recentRaceResult: RecentRaceResult(distanceKilometers: 5, timeSeconds: 1_420, source: .pacepilotGPS),
            injuryCaution: false,
            strengthPreference: profile.strengthPreference,
            preferredLongRunDay: profile.preferredLongRunDay
        )

        let plan = PlanGenerator.generate(from: input)
        XCTAssertGreaterThanOrEqual(plan.weeks.count, 6)
        XCTAssertTrue(plan.weeks.contains { $0.phase == .recovery })
        XCTAssertTrue(plan.weeks.contains { $0.phase == .taper })
        XCTAssertTrue(plan.weeks.flatMap(\.workouts).contains { $0.type == .longRun })
    }

    func testInjuryCautionLimitsHardWorkouts() {
        var profile = RunnerProfile.demo
        profile.injuryCaution = true
        let plan = TrainingPlanService().generateDemoPlan(for: profile)
        let hardWorkouts = plan.weeks.flatMap(\.workouts).filter(\.isHard)

        XCTAssertLessThanOrEqual(hardWorkouts.count, 1)
    }
}
