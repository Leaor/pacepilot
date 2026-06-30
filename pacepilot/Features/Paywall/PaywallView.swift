import SwiftUI

struct PaywallView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.appEnvironment) private var environment
    @EnvironmentObject private var appState: AppState
    @State private var purchaseOptions: [RevenueCatPurchaseOption] = []
    @State private var isLoadingProducts = false
    @State private var processingTier: SubscriptionTier?
    @State private var actionResult: PaywallActionResult?
    @State private var managementURL: URL?

    private let tiers: [(SubscriptionTier, String, [String])] = [
        (.free, "$0", ["1 active plan", "Manual logging", "Basic events", "Basic insights", "Strava connection status only"]),
        (.pro, "$9.99", ["Adaptive training", "Advanced pace zones", "Event-to-plan builder", "Shoe tracker", "Progress dashboard", "Calendar export"]),
        (.elite, "$19.99", ["AI Coach", "Race strategy", "Race readiness", "Race checklist", "Audio Coach", "Priority support"])
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PPSpacing.lg) {
                Text("Upgrade PacePilot")
                    .font(PPTypography.largeTitle)
                Text("Choose the coaching depth that matches your season. Subscription access is verified before paid features unlock.")
                    .foregroundStyle(PPColors.textMuted)

                if isLoadingProducts {
                    ProgressView("Loading subscription products...")
                        .tint(PPColors.orange)
                }

                ForEach(tiers, id: \.0) { tier, price, features in
                    PPCard {
                        VStack(alignment: .leading, spacing: PPSpacing.md) {
                            HStack {
                                Text(tier.title)
                                    .font(PPTypography.title)
                                Spacer()
                                Text(displayPrice(for: tier, fallback: price))
                                    .font(PPTypography.metric)
                                    .foregroundStyle(PPColors.orange)
                            }
                            ForEach(features, id: \.self) { feature in
                                Label(feature, systemImage: "checkmark.circle.fill")
                                    .foregroundStyle(PPColors.textMuted)
                            }
                            PPButton(title: buttonTitle(for: tier), systemImage: tier == .free ? "checkmark" : "sparkles") {
                                selectTier(tier)
                            }
                            .disabled(buttonIsDisabled(for: tier))
                            .opacity(buttonIsDisabled(for: tier) ? 0.58 : 1)
                        }
                    }
                }

                PPButton(title: processingTier == .free ? "Restoring..." : "Restore Purchases", systemImage: "arrow.clockwise", role: .secondary) {
                    restorePurchases()
                }
                .disabled(processingTier != nil)
                .opacity(processingTier != nil ? 0.58 : 1)

                PPButton(title: "Manage Subscription", systemImage: "creditcard", role: .quiet) {
                    manageSubscription()
                }
            }
            .padding(PPSpacing.md)
        }
        .ppScreen()
        .navigationTitle("Paywall")
        .task {
            await loadPurchaseOptions()
        }
        .alert(actionResult?.title ?? "Subscription", isPresented: Binding(get: { actionResult != nil }, set: { if !$0 { actionResult = nil } })) {
            Button("OK") { actionResult = nil }
        } message: {
            Text(actionResult?.message ?? "")
        }
    }

    private func displayPrice(for tier: SubscriptionTier, fallback: String) -> String {
        purchaseOptions.first { $0.tier == tier }?.price ?? fallback
    }

    private func buttonTitle(for tier: SubscriptionTier) -> String {
        if processingTier == tier {
            return tier == .free ? "Selecting..." : "Processing..."
        }

        if appState.subscription.tier == tier {
            return tier == .free ? "Current Free" : "Current \(tier.title)"
        }

        if tier == .free {
            return "Use Free"
        }

        return environment.allowsMockSubscriptions ? "Preview \(tier.title)" : "Subscribe to \(tier.title)"
    }

    private func buttonIsDisabled(for tier: SubscriptionTier) -> Bool {
        processingTier != nil || appState.subscription.tier == tier
    }

    private func loadPurchaseOptions() async {
        guard purchaseOptions.isEmpty else {
            return
        }

        isLoadingProducts = true
        defer { isLoadingProducts = false }

        do {
            purchaseOptions = try await revenueCatService().availablePurchaseOptions()
            if purchaseOptions.isEmpty && !environment.allowsMockSubscriptions {
                actionResult = PaywallActionResult(
                    title: "Subscriptions unavailable",
                    message: "No RevenueCat products are configured for the current offering."
                )
            }
        } catch {
            if !environment.allowsMockSubscriptions {
                actionResult = PaywallActionResult(title: "Subscriptions unavailable", message: error.localizedDescription)
            }
        }
    }

    private func selectTier(_ tier: SubscriptionTier) {
        guard processingTier == nil else {
            return
        }

        if tier == .free {
            appState.subscription = Subscription(id: appState.subscription.id, tier: .free, status: .inactive, renewalDate: nil, isMockMode: false)
            actionResult = PaywallActionResult(title: "Free plan selected", message: "Paid features remain locked until an App Store subscription is active.")
            return
        }

        processingTier = tier
        Task {
            defer { processingTier = nil }

            do {
                let result = try await revenueCatService().purchase(tier: tier)
                appState.subscription = preserveSubscriptionId(result.subscription)
                managementURL = result.managementURL
                actionResult = PaywallActionResult(title: "Subscription updated", message: result.message)
            } catch {
                actionResult = PaywallActionResult(title: "Subscription unavailable", message: error.localizedDescription)
            }
        }
    }

    private func restorePurchases() {
        guard processingTier == nil else {
            return
        }

        processingTier = .free
        Task {
            defer { processingTier = nil }

            do {
                let result = try await revenueCatService().restorePurchases()
                appState.subscription = preserveSubscriptionId(result.subscription)
                managementURL = result.managementURL
                actionResult = PaywallActionResult(title: "Restore complete", message: result.message)
            } catch {
                actionResult = PaywallActionResult(title: "Restore unavailable", message: error.localizedDescription)
            }
        }
    }

    private func manageSubscription() {
        guard let url = managementURL ?? URL(string: "https://apps.apple.com/account/subscriptions") else {
            actionResult = PaywallActionResult(title: "Subscriptions unavailable", message: "Could not open App Store subscription management.")
            return
        }

        openURL(url)
    }

    private func revenueCatService() -> RevenueCatService {
        RevenueCatService(environment: environment)
    }

    private func preserveSubscriptionId(_ subscription: Subscription) -> Subscription {
        Subscription(
            id: appState.subscription.id,
            tier: subscription.tier,
            status: subscription.status,
            renewalDate: subscription.renewalDate,
            isMockMode: subscription.isMockMode
        )
    }
}

private struct PaywallActionResult: Identifiable, Hashable {
    let id = UUID()
    var title: String
    var message: String
}
