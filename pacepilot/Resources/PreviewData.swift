import Foundation

enum PreviewData {
    static let demoProfile = RunnerProfile.demo
    static let demoPrivacy = PrivacyPreferences.demo

    static var demoPlan: TrainingPlan {
        let service = TrainingPlanService()
        return service.generateDemoPlan(for: demoProfile)
    }

    static var demoActivities: [Activity] {
        let shoeID = demoShoes.first?.id
        return [
            Activity(
                id: UUID(uuidString: "33333333-3333-3333-3333-333333333333")!,
                source: .pacepilotGPS,
                startedAt: Calendar.current.date(byAdding: .day, value: -1, to: .now) ?? .now,
                distanceKilometers: 8.2,
                durationSeconds: 2_886,
                elevationMeters: 42,
                averageHeartRate: 148,
                perceivedEffort: 4,
                fatigueAfter: 2,
                notes: "Smooth aerobic run by feel.",
                shoeID: shoeID,
                splits: [
                    ActivitySplit(kilometer: 1, paceSeconds: 356),
                    ActivitySplit(kilometer: 2, paceSeconds: 350),
                    ActivitySplit(kilometer: 3, paceSeconds: 352)
                ],
                route: [
                    ActivityRoutePoint(latitude: 43.6532, longitude: -79.3832, recordedAt: Calendar.current.date(byAdding: .minute, value: -48, to: .now) ?? .now),
                    ActivityRoutePoint(latitude: 43.6578, longitude: -79.3811, recordedAt: Calendar.current.date(byAdding: .minute, value: -36, to: .now) ?? .now),
                    ActivityRoutePoint(latitude: 43.6614, longitude: -79.3768, recordedAt: Calendar.current.date(byAdding: .minute, value: -24, to: .now) ?? .now),
                    ActivityRoutePoint(latitude: 43.6652, longitude: -79.3716, recordedAt: Calendar.current.date(byAdding: .minute, value: -12, to: .now) ?? .now)
                ]
            ),
            Activity(
                id: UUID(uuidString: "44444444-4444-4444-4444-444444444444")!,
                source: .pacepilotManual,
                startedAt: Calendar.current.date(byAdding: .day, value: -3, to: .now) ?? .now,
                distanceKilometers: 6.0,
                durationSeconds: 2_070,
                elevationMeters: 12,
                averageHeartRate: nil,
                perceivedEffort: 6,
                fatigueAfter: 3,
                notes: "Tempo felt controlled.",
                shoeID: shoeID,
                splits: []
            ),
            Activity(
                id: UUID(uuidString: "55555555-5555-5555-5555-555555555555")!,
                source: .stravaCache,
                startedAt: Calendar.current.date(byAdding: .day, value: -5, to: .now) ?? .now,
                distanceKilometers: 10.1,
                durationSeconds: 3_650,
                elevationMeters: 88,
                averageHeartRate: 151,
                perceivedEffort: 5,
                fatigueAfter: 3,
                notes: "Display-only Strava sync. Excluded from AI.",
                shoeID: nil,
                splits: []
            )
        ]
    }

    static var demoEvents: [RaceEvent] {
        [
            RaceEvent(
                id: UUID(uuidString: "66666666-6666-6666-6666-666666666666")!,
                name: "Toronto Waterfront 10K",
                location: "Toronto, Ontario",
                date: Calendar.current.date(byAdding: .day, value: 62, to: .now) ?? .now,
                distanceKilometers: 10,
                terrain: .road,
                elevationMeters: 48,
                vibe: .fast,
                registrationURL: URL(string: "https://example.com/toronto-waterfront-10k"),
                isFeatured: true
            ),
            RaceEvent(
                id: UUID(uuidString: "77777777-7777-7777-7777-777777777777")!,
                name: "Hamilton Bayfront Half",
                location: "Hamilton, Ontario",
                date: Calendar.current.date(byAdding: .day, value: 91, to: .now) ?? .now,
                distanceKilometers: 21.1,
                terrain: .mixed,
                elevationMeters: 115,
                vibe: .scenic,
                registrationURL: URL(string: "https://example.com/hamilton-half"),
                isFeatured: true
            ),
            RaceEvent(
                id: UUID(uuidString: "88888888-8888-8888-8888-888888888888")!,
                name: "Berlin Autumn Marathon",
                location: "Berlin, Germany",
                date: Calendar.current.date(byAdding: .day, value: 124, to: .now) ?? .now,
                distanceKilometers: 42.195,
                terrain: .road,
                elevationMeters: 34,
                vibe: .destination,
                registrationURL: URL(string: "https://example.com/berlin-autumn-marathon"),
                isFeatured: true
            )
        ]
    }

    static var demoShoes: [Shoe] {
        [
            Shoe(
                id: UUID(uuidString: "99999999-9999-9999-9999-999999999999")!,
                brand: "PacePilot",
                model: "Fleet Trainer",
                nickname: "Orange pair",
                purchaseDate: Calendar.current.date(byAdding: .month, value: -3, to: .now) ?? .now,
                startingMileage: 0,
                currentMileage: 286,
                retirementMileageTarget: 650,
                notes: "Daily trainer.",
                status: .active
            ),
            Shoe(
                id: UUID(uuidString: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")!,
                brand: "PacePilot",
                model: "Race Wing",
                nickname: "Race day",
                purchaseDate: Calendar.current.date(byAdding: .month, value: -1, to: .now) ?? .now,
                startingMileage: 0,
                currentMileage: 42,
                retirementMileageTarget: 320,
                notes: "Use for workouts and races.",
                status: .active
            )
        ]
    }

    static let demoSubscription = Subscription(
        id: UUID(uuidString: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")!,
        tier: .elite,
        status: .trial,
        renewalDate: Calendar.current.date(byAdding: .day, value: 11, to: .now),
        isMockMode: true
    )

    static let demoReadiness = RaceReadinessEngine.score(planAdherence: 0.82, fatigue: 2, longRunProgress: 0.76, daysToRace: 62)

    static var demoAIThreads: [AIChatThread] {
        [
            AIChatThread(
                id: UUID(uuidString: "cccccccc-cccc-cccc-cccc-cccccccccccc")!,
                title: "10K pacing",
                messages: [
                    AIChatMessage(
                        id: UUID(),
                        role: .assistant,
                        text: "Your 10K plan should feel controlled through 7 km, then gradually tighten effort if breathing is stable.",
                        createdAt: .now,
                        usedSources: ["profile", "training_plans", "activities:pacepilot_gps"],
                        excludedSources: ["activities:strava_cache"]
                    )
                ],
                updatedAt: .now
            )
        ]
    }

    static var demoCheckIns: [CheckIn] {
        [
            CheckIn(
                id: UUID(uuidString: "dddddddd-dddd-dddd-dddd-dddddddddddd")!,
                date: .now,
                fatigue: 2,
                soreness: 2,
                sleepHours: 7.3,
                motivation: 4,
                weekDifficulty: 3,
                nextWeekPreference: .maintain,
                notes: "Feeling steady."
            )
        ]
    }
}
