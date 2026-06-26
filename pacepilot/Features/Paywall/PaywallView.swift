import SwiftUI

struct PaywallView: View {
    @EnvironmentObject private var appState: AppState
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
                Text("Mock subscription mode is enabled for development. RevenueCat entitlement wiring is isolated behind RevenueCatService.")
                    .foregroundStyle(PPColors.textMuted)
                ForEach(tiers, id: \.0) { tier, price, features in
                    PPCard {
                        VStack(alignment: .leading, spacing: PPSpacing.md) {
                            HStack {
                                Text(tier.title)
                                    .font(PPTypography.title)
                                Spacer()
                                Text(price)
                                    .font(PPTypography.metric)
                                    .foregroundStyle(PPColors.orange)
                            }
                            ForEach(features, id: \.self) { feature in
                                Label(feature, systemImage: "checkmark.circle.fill")
                                    .foregroundStyle(PPColors.textMuted)
                            }
                            PPButton(title: tier == .free ? "Current Free" : "Start Trial", systemImage: "sparkles") {
                                appState.subscription.tier = tier
                            }
                        }
                    }
                }
                PPButton(title: "Manage Subscription", systemImage: "creditcard", role: .secondary) {}
            }
            .padding(PPSpacing.md)
        }
        .ppScreen()
        .navigationTitle("Paywall")
    }
}
