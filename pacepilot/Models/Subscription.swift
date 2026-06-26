import Foundation

enum SubscriptionTier: String, Codable, CaseIterable, Identifiable {
    case free
    case pro
    case elite

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

enum SubscriptionStatus: String, Codable {
    case inactive
    case trial
    case active
    case expired
}

struct Subscription: Identifiable, Codable, Hashable {
    var id: UUID
    var tier: SubscriptionTier
    var status: SubscriptionStatus
    var renewalDate: Date?
    var isMockMode: Bool

    func unlocks(_ tier: SubscriptionTier) -> Bool {
        switch (self.tier, tier) {
        case (.elite, _): true
        case (.pro, .free), (.pro, .pro): true
        case (.free, .free): true
        default: false
        }
    }
}
