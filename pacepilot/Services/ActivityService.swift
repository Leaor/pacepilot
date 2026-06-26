import Foundation
import Combine

@MainActor
final class ActivityService: ObservableObject {
    @Published var draftDistance = ""
    @Published var draftDuration = ""
    @Published var draftNotes = ""

    func manualActivity(distanceKilometers: Double, durationMinutes: Int, shoeID: UUID?) -> Activity {
        Activity(
            id: UUID(),
            source: .pacepilotManual,
            startedAt: .now,
            distanceKilometers: distanceKilometers,
            durationSeconds: durationMinutes * 60,
            elevationMeters: 0,
            averageHeartRate: nil,
            perceivedEffort: 4,
            fatigueAfter: 2,
            notes: draftNotes,
            shoeID: shoeID,
            splits: [],
            route: []
        )
    }

    func save(_ activity: Activity, into appState: AppState) {
        appState.saveActivity(activity)
    }

    func deleteStravaCache(from appState: AppState) {
        appState.activities.removeAll { $0.source == .stravaCache }
    }
}
