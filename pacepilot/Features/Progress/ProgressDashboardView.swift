import Charts
import SwiftUI

struct ProgressDashboardView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PPSpacing.lg) {
                Text("Progress")
                    .font(PPTypography.largeTitle)

                PPCard {
                    VStack(alignment: .leading) {
                        Text("Weekly Mileage")
                            .font(PPTypography.title)
                        Chart(appState.activities) { activity in
                            BarMark(
                                x: .value("Date", activity.startedAt, unit: .day),
                                y: .value("Kilometers", activity.distanceKilometers)
                            )
                            .foregroundStyle(PPColors.orange)
                        }
                        .frame(height: 180)
                    }
                }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: PPSpacing.md) {
                    metric("Monthly mileage", String(format: "%.1f km", appState.activities.reduce(0) { $0 + $1.distanceKilometers }))
                    metric("Long-run progression", "76%")
                    metric("Average pace trend", "Improving")
                    metric("Easy / hard balance", "82 / 18")
                    metric("Plan adherence", "82%")
                    metric("Completion streak", "5")
                    metric("Fatigue trend", "Stable")
                    metric("Training load", "Moderate")
                    metric("Consistency score", "84")
                    metric("Race readiness", "\(appState.readiness.score)")
                }
            }
            .padding(PPSpacing.md)
        }
        .ppScreen()
        .navigationTitle("Progress")
    }

    private func metric(_ title: String, _ value: String) -> some View {
        PPCard {
            VStack(alignment: .leading, spacing: PPSpacing.sm) {
                Text(value)
                    .font(PPTypography.metric)
                    .foregroundStyle(PPColors.textWhite)
                Text(title)
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
