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
    @Published var pendingPasswordUpdate = false
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
        let profile = Self.accountProfile(email: nil)
        self.profile = profile
        self.privacy = Self.accountPrivacy()
        self.trainingPlan = Self.emptyTrainingPlan(for: profile)
        self.activities = []
        self.events = []
        self.shoes = []
        self.subscription = Self.freeSubscription()
        self.readiness = Self.emptyReadiness()
        self.aiThreads = []
        self.checkIns = []
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
        trainingPlan.currentWeek?.targetDistanceKilometers ?? 0
    }

    func activateAuthenticatedAccount(email: String?) {
        let accountProfile = Self.accountProfile(email: email)
        profile = accountProfile
        privacy = Self.accountPrivacy()
        trainingPlan = Self.emptyTrainingPlan(for: accountProfile)
        activities = []
        events = []
        shoes = []
        subscription = Self.freeSubscription()
        readiness = Self.emptyReadiness()
        aiThreads = []
        checkIns = []
        isDemoMode = false
        isAuthenticated = true
        pendingPasswordUpdate = false
        selectedTab = .today
    }

    func activateDemoMode() {
        loadPreviewState()
        isDemoMode = true
        isAuthenticated = false
        pendingPasswordUpdate = false
        selectedTab = .today
    }

    func signOutLocally() {
        activateSignedOutState()
    }

    private func activateSignedOutState() {
        let accountProfile = Self.accountProfile(email: nil)
        profile = accountProfile
        privacy = Self.accountPrivacy()
        trainingPlan = Self.emptyTrainingPlan(for: accountProfile)
        activities = []
        events = []
        shoes = []
        subscription = Self.freeSubscription()
        readiness = Self.emptyReadiness()
        aiThreads = []
        checkIns = []
        isDemoMode = false
        isAuthenticated = false
        pendingPasswordUpdate = false
        selectedTab = .today
    }

    private func loadPreviewState() {
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

    private static func accountProfile(email: String?) -> RunnerProfile {
        let normalizedEmail = email?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        let displayName = normalizedEmail
            .split(separator: "@")
            .first
            .map { String($0).replacingOccurrences(of: ".", with: " ").capitalized }
            .flatMap { $0.isEmpty ? nil : $0 } ?? "Runner"

        return RunnerProfile(
            id: UUID(),
            name: displayName,
            email: normalizedEmail,
            ageRange: "",
            timezone: TimeZone.current.identifier,
            units: .kilometers,
            experience: .casual,
            currentWeeklyMileage: 0,
            longestRecentRun: 0,
            goal: .maintainFitness,
            raceDate: Calendar.current.date(byAdding: .month, value: 3, to: .now) ?? .now,
            goalTimeSeconds: nil,
            availableRunDays: [],
            preferredLongRunDay: .sunday,
            strengthPreference: .none,
            equipment: .none,
            injuryCaution: false,
            coachingTone: .calm
        )
    }

    private static func accountPrivacy() -> PrivacyPreferences {
        PrivacyPreferences(
            id: UUID(),
            aiCoachEnabled: false,
            aiCanUsePacePilotActivityHistory: false,
            aiCanUseCheckIns: false,
            aiCanUseRaceGoals: false,
            aiCanUseChatHistory: false,
            aiCanUseUserProvidedImports: false,
            aiCanUseGarminData: false,
            aiCanUseAppleHealthData: false,
            profilePrivate: true,
            activityPrivate: true
        )
    }

    private static func emptyTrainingPlan(for profile: RunnerProfile) -> TrainingPlan {
        TrainingPlan(
            id: UUID(),
            name: "No active plan",
            goal: profile.goal,
            raceDate: profile.raceDate,
            createdAt: .now,
            weeks: [],
            paceZones: PaceEngine.zones(from: nil, goalDistanceKilometers: profile.goal.raceDistanceKilometers, goalTimeSeconds: nil),
            aRace: nil,
            bRace: nil
        )
    }

    private static func freeSubscription() -> Subscription {
        Subscription(id: UUID(), tier: .free, status: .inactive, renewalDate: nil, isMockMode: false)
    }

    private static func emptyReadiness() -> RaceReadinessScore {
        RaceReadinessScore(
            id: UUID(),
            score: 0,
            label: .building,
            explanations: [],
            recommendedNextAction: "Create a plan to generate race readiness.",
            generatedAt: .now
        )
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
