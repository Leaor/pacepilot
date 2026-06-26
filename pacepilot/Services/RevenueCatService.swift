import Foundation

#if canImport(RevenueCat)
import RevenueCat
#endif

enum Entitlement: String, CaseIterable {
    case adaptiveTraining
    case progressDashboard
    case aiCoach
    case raceStrategy
    case audioCoach
    case shoeTracker
}

struct RevenueCatService {
    var mockSubscriptions: Bool

    func hasAccess(to entitlement: Entitlement, subscription: Subscription) -> Bool {
        if mockSubscriptions { return true }
        switch entitlement {
        case .aiCoach, .raceStrategy, .audioCoach:
            return subscription.unlocks(.elite)
        case .adaptiveTraining, .progressDashboard, .shoeTracker:
            return subscription.unlocks(.pro)
        }
    }
}
