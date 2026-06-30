import Foundation

#if canImport(RevenueCat)
import RevenueCat
#endif

struct RevenueCatPurchaseOption: Identifiable, Hashable {
    var id: String
    var tier: SubscriptionTier
    var price: String
    var productIdentifier: String
}

struct RevenueCatPurchaseResult: Hashable {
    var subscription: Subscription
    var message: String
    var managementURL: URL?
}

enum Entitlement: String, CaseIterable {
    case adaptiveTraining
    case progressDashboard
    case aiCoach
    case raceStrategy
    case audioCoach
    case shoeTracker
}

struct RevenueCatService {
    var apiKey: String = ""
    var mockSubscriptions: Bool
    var isProduction: Bool = false

    private var allowsMockSubscriptions: Bool {
        mockSubscriptions && !isProduction
    }

    init(apiKey: String = "", mockSubscriptions: Bool, isProduction: Bool = false) {
        self.apiKey = apiKey
        self.mockSubscriptions = mockSubscriptions
        self.isProduction = isProduction
    }

    init(environment: AppEnvironment) {
        self.init(
            apiKey: environment.revenueCatAPIKey,
            mockSubscriptions: environment.mockSubscriptions,
            isProduction: environment.isProduction
        )
    }

    func hasAccess(to entitlement: Entitlement, subscription: Subscription) -> Bool {
        if allowsMockSubscriptions {
            return true
        }

        switch entitlement {
        case .aiCoach, .raceStrategy, .audioCoach:
            return subscription.unlocks(.elite)
        case .adaptiveTraining, .progressDashboard, .shoeTracker:
            return subscription.unlocks(.pro)
        }
    }

    func availablePurchaseOptions() async throws -> [RevenueCatPurchaseOption] {
        if allowsMockSubscriptions {
            return [
                RevenueCatPurchaseOption(id: "mock-pro", tier: .pro, price: "$9.99", productIdentifier: "mock_pro"),
                RevenueCatPurchaseOption(id: "mock-elite", tier: .elite, price: "$19.99", productIdentifier: "mock_elite")
            ]
        }

        #if canImport(RevenueCat)
        let purchases = try configuredPurchases()
        let offerings = try await purchases.offerings()
        return [SubscriptionTier.pro, .elite].compactMap { tier in
            guard let package = package(for: tier, in: offerings) else {
                return nil
            }

            return RevenueCatPurchaseOption(
                id: "\(tier.rawValue)-\(package.identifier)-\(package.storeProduct.productIdentifier)",
                tier: tier,
                price: package.localizedPriceString,
                productIdentifier: package.storeProduct.productIdentifier
            )
        }
        #else
        throw RevenueCatServiceError.sdkUnavailable
        #endif
    }

    func purchase(tier: SubscriptionTier) async throws -> RevenueCatPurchaseResult {
        guard tier != .free else {
            return RevenueCatPurchaseResult(subscription: freeSubscription(), message: "Free plan selected.", managementURL: nil)
        }

        if allowsMockSubscriptions {
            return RevenueCatPurchaseResult(
                subscription: Subscription(id: UUID(), tier: tier, status: .active, renewalDate: nil, isMockMode: true),
                message: "\(tier.title) preview enabled for this development build.",
                managementURL: nil
            )
        }

        #if canImport(RevenueCat)
        let purchases = try configuredPurchases()
        let offerings = try await purchases.offerings()
        guard let package = package(for: tier, in: offerings) else {
            throw RevenueCatServiceError.packageUnavailable(tier.title)
        }

        let result = try await purchases.purchase(package: package)
        if result.userCancelled {
            throw RevenueCatServiceError.purchaseCancelled
        }

        return RevenueCatPurchaseResult(
            subscription: subscription(from: result.customerInfo),
            message: "Subscription updated from App Store receipt status.",
            managementURL: result.customerInfo.managementURL
        )
        #else
        throw RevenueCatServiceError.sdkUnavailable
        #endif
    }

    func restorePurchases() async throws -> RevenueCatPurchaseResult {
        if allowsMockSubscriptions {
            return RevenueCatPurchaseResult(
                subscription: Subscription(id: UUID(), tier: .elite, status: .active, renewalDate: nil, isMockMode: true),
                message: "Elite preview restored for this development build.",
                managementURL: nil
            )
        }

        #if canImport(RevenueCat)
        let purchases = try configuredPurchases()
        let customerInfo = try await purchases.restorePurchases()
        return RevenueCatPurchaseResult(
            subscription: subscription(from: customerInfo),
            message: customerInfo.entitlements.active.isEmpty
                ? "No active App Store subscription was found for this account."
                : "Purchases restored from App Store receipt status.",
            managementURL: customerInfo.managementURL
        )
        #else
        throw RevenueCatServiceError.sdkUnavailable
        #endif
    }

    private func freeSubscription() -> Subscription {
        Subscription(id: UUID(), tier: .free, status: .inactive, renewalDate: nil, isMockMode: false)
    }

    #if canImport(RevenueCat)
    private func configuredPurchases() throws -> Purchases {
        let normalizedAPIKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard normalizedAPIKey.count >= 20,
              !normalizedAPIKey.contains("$("),
              !["not-configured", "placeholder-revenuecat-key"].contains(normalizedAPIKey) else {
            throw RevenueCatServiceError.missingAPIKey
        }

        if Purchases.isConfigured {
            return Purchases.shared
        }

        return Purchases.configure(withAPIKey: normalizedAPIKey)
    }

    private func package(for tier: SubscriptionTier, in offerings: Offerings) -> Package? {
        let tierName = tier.rawValue.lowercased()
        let offeringsToSearch = ([offerings.offering(identifier: tierName), offerings.current] + Array(offerings.all.values))
            .compactMap { $0 }

        let packages = offeringsToSearch.flatMap(\.availablePackages)
        return packages.first { package in
            [
                package.identifier,
                package.offeringIdentifier,
                package.storeProduct.productIdentifier,
                package.storeProduct.localizedTitle
            ].contains { field in
                field.lowercased().contains(tierName)
            }
        }
    }

    private func subscription(from customerInfo: CustomerInfo) -> Subscription {
        let tier = subscriptionTier(from: customerInfo)
        return Subscription(
            id: UUID(),
            tier: tier,
            status: tier == .free ? .inactive : .active,
            renewalDate: customerInfo.latestExpirationDate,
            isMockMode: false
        )
    }

    private func subscriptionTier(from customerInfo: CustomerInfo) -> SubscriptionTier {
        let activeEntitlements = Set(customerInfo.entitlements.active.keys.map { $0.lowercased() })
        let activeProducts = Set(customerInfo.activeSubscriptions.map { $0.lowercased() })
        let activeIdentifiers = activeEntitlements.union(activeProducts)

        if activeIdentifiers.contains(where: { identifier in
            ["elite", "ai_coach", "aicoach", "race_strategy", "racestrategy", "audio_coach", "audiocoach"].contains(identifier)
                || identifier.contains("elite")
        }) {
            return .elite
        }

        if activeIdentifiers.contains(where: { identifier in
            ["pro", "adaptive_training", "adaptivetraining", "progress_dashboard", "progressdashboard", "shoe_tracker", "shoetracker"].contains(identifier)
                || identifier.contains("pro")
        }) {
            return .pro
        }

        return .free
    }
    #endif
}

enum RevenueCatServiceError: LocalizedError {
    case missingAPIKey
    case sdkUnavailable
    case packageUnavailable(String)
    case purchaseCancelled

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            "Add `REVENUECAT_IOS_API_KEY` before starting or restoring subscriptions."
        case .sdkUnavailable:
            "RevenueCat SDK is not linked in this build."
        case .packageUnavailable(let tier):
            "No RevenueCat package is configured for \(tier). Check the current offering and product identifiers."
        case .purchaseCancelled:
            "Purchase cancelled."
        }
    }
}
