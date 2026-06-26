import Foundation
import Combine

enum AppRoute: Hashable {
    case onboarding
    case workout(UUID)
    case activity(UUID)
    case event(UUID)
    case shoe(UUID)
    case paywall(SubscriptionTier)
    case privacyCenter
    case support
}

@MainActor
final class AppRouter: ObservableObject {
    @Published var path: [AppRoute] = []

    func push(_ route: AppRoute) {
        path.append(route)
    }

    func reset() {
        path.removeAll()
    }
}
