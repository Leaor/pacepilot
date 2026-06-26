import Foundation
import HealthKit

struct HealthKitService {
    private let store = HKHealthStore()

    func isAvailable() -> Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    func requestReadPermission() async throws {
        guard isAvailable() else { return }
        let distance = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!
        let workout = HKObjectType.workoutType()
        try await store.requestAuthorization(toShare: [], read: [distance, workout])
    }
}
