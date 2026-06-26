import Foundation

struct TrainingPlanService {
    func generateDemoPlan(for profile: RunnerProfile) -> TrainingPlan {
        PlanGenerator.generate(
            from: PlanInput(
                goal: profile.goal,
                raceDate: profile.raceDate,
                goalTimeSeconds: profile.goalTimeSeconds,
                currentWeeklyMileage: profile.currentWeeklyMileage,
                trainingDaysPerWeek: profile.availableRunDays.count,
                availableRunDays: profile.availableRunDays,
                experienceLevel: profile.experience,
                recentRaceResult: RecentRaceResult(distanceKilometers: 5, timeSeconds: 22 * 60 + 40, source: .pacepilotManual),
                injuryCaution: profile.injuryCaution,
                strengthPreference: profile.strengthPreference,
                preferredLongRunDay: profile.preferredLongRunDay
            )
        )
    }
}
