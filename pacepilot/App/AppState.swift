import Foundation
import Combine
import SwiftUI

enum AppTab: Hashable {
    case today
    case plan
    case activities
    case events
    case coach
    case profile
}

@MainActor
final class AppState: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isDemoMode = false
    @Published var selectedTab: AppTab = .today
    @Published var profile: RunnerProfile
    @Published var privacy: PrivacyPreferences
    @Published var trainingPlan: TrainingPlan
    @Published var activities: [Activity]
    @Published var events: [RaceEvent]
    @Published var shoes: [Shoe]
    @Published var subscription: Subscription
    @Published var readiness: RaceReadinessScore
    @Published var aiThreads: [AIChatThread]
    @Published var checkIns: [CheckIn]

    init() {
        let demoPlan = PreviewData.demoPlan
        self.profile = PreviewData.demoProfile
        self.privacy = PreviewData.demoPrivacy
        self.trainingPlan = demoPlan
        self.activities = PreviewData.demoActivities
        self.events = PreviewData.demoEvents
        self.shoes = PreviewData.demoShoes
        self.subscription = PreviewData.demoSubscription
        self.readiness = PreviewData.demoReadiness
        self.aiThreads = PreviewData.demoAIThreads
        self.checkIns = PreviewData.demoCheckIns
    }

    var todaysWorkout: Workout? {
        trainingPlan.weeks.flatMap(\.workouts).first { Calendar.current.isDateInToday($0.scheduledDate) }
            ?? trainingPlan.weeks.flatMap(\.workouts).first { $0.status == .planned }
    }

    var weeklyDistanceCompleted: Double {
        let week = Calendar.current.dateInterval(of: .weekOfYear, for: .now)
        return activities
            .filter { activity in
                guard let week else { return false }
                return week.contains(activity.startedAt)
            }
            .reduce(0) { $0 + $1.distanceKilometers }
    }

    var weeklyDistanceTarget: Double {
        trainingPlan.currentWeek?.targetDistanceKilometers ?? 42
    }

    func activateDemoMode() {
        isDemoMode = true
        isAuthenticated = false
    }

    func complete(_ workout: Workout) {
        trainingPlan.updateWorkout(workout.id, status: .completed)
    }

    func saveActivity(_ activity: Activity) {
        activities.removeAll { $0.id == activity.id }
        activities.insert(activity, at: 0)

        if let workoutID = activity.workoutID {
            trainingPlan.updateWorkout(workoutID, status: .completed)
        }

        if let shoeID = activity.shoeID, let shoeIndex = shoes.firstIndex(where: { $0.id == shoeID }) {
            shoes[shoeIndex].currentMileage += activity.distanceKilometers
        }
    }

    func deleteStravaCache() {
        activities.removeAll { $0.source == .stravaCache }
    }

    func stravaActivities() -> [Activity] {
        activities.filter { $0.source == .stravaCache }
    }
}
