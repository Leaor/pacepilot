import SwiftUI

struct RaceStrategyBuilderView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    let event: RaceEvent?
    @State private var goalTimeMinutes = 47.0
    @State private var pacingStyle: RacePacingStyle = .negativeSplit
    @State private var units: Units = .kilometers

    private var strategy: RaceStrategy {
        RaceStrategyBuilder.build(
            event: event,
            goalTimeSeconds: goalTimeMinutes * 60,
            pacingStyle: pacingStyle,
            units: units
        )
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Goal") {
                    Stepper("Goal time: \(Int(goalTimeMinutes)) min", value: $goalTimeMinutes, in: 15...360, step: 1)
                    Picker("Pacing style", selection: $pacingStyle) {
                        ForEach(RacePacingStyle.allCases) { Text($0.title).tag($0) }
                    }
                    Picker("Splits", selection: $units) {
                        ForEach(Units.allCases) { Text($0.label).tag($0) }
                    }
                }
                Section("Strategy") {
                    Text(strategy.warmupPlan)
                    ForEach(strategy.splits.prefix(12)) { split in
                        HStack {
                            Text(split.distanceLabel)
                            Spacer()
                            Text(PaceRange.format(split.targetPaceSeconds))
                                .foregroundStyle(PPColors.orange)
                        }
                        Text(split.cue)
                            .font(PPTypography.caption)
                            .foregroundStyle(PPColors.textMuted)
                    }
                }
                Section("Fuel and hydration") {
                    ForEach(strategy.fuelingReminders, id: \.self) { Text($0) }
                    ForEach(strategy.hydrationReminders, id: \.self) { Text($0) }
                }
                Section("Backup plan") {
                    Text(strategy.backupPlan)
                    ForEach(strategy.cautions, id: \.self) { Text($0) }
                }
                Section {
                    PPButton(title: "Save Strategy", systemImage: "checkmark.circle.fill") {
                        dismiss()
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .navigationTitle("Race Strategy")
            .toolbar { Button("Done") { dismiss() } }
            .onAppear { units = appState.profile.units }
        }
    }
}

struct RaceReadinessView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        PPCard {
            VStack(alignment: .leading, spacing: PPSpacing.md) {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Race Readiness")
                            .font(PPTypography.title)
                        Text(appState.readiness.label.title)
                            .foregroundStyle(PPColors.textMuted)
                    }
                    Spacer()
                    PPProgressRing(value: Double(appState.readiness.score) / 100, color: readinessColor)
                        .frame(width: 82, height: 82)
                }
                ForEach(appState.readiness.explanations) { explanation in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(explanation.title)
                            .font(PPTypography.headline)
                        Text(explanation.detail)
                            .font(PPTypography.caption)
                            .foregroundStyle(PPColors.textMuted)
                    }
                }
                Text(appState.readiness.recommendedNextAction)
                    .foregroundStyle(PPColors.orange)
                Text("Estimate only, no guarantee. Strava data is not used.")
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)
            }
        }
    }

    private var readinessColor: Color {
        switch appState.readiness.label {
        case .needsRecovery: PPColors.error
        case .building: PPColors.warning
        case .onTrack: PPColors.aiCyan
        case .raceReady, .taperSmart: PPColors.easyGreen
        }
    }
}

struct RaceChecklistView: View {
    @State private var completed: Set<String> = []
    private let items = RaceChecklistBuilder.checklistItems()

    var body: some View {
        PPCard {
            VStack(alignment: .leading, spacing: PPSpacing.md) {
                Text("Race Weekend Checklist")
                    .font(PPTypography.title)
                ForEach(items, id: \.self) { item in
                    Button {
                        if completed.contains(item) {
                            completed.remove(item)
                        } else {
                            completed.insert(item)
                        }
                    } label: {
                        HStack {
                            Image(systemName: completed.contains(item) ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(completed.contains(item) ? PPColors.easyGreen : PPColors.textMuted)
                            Text(item)
                            Spacer()
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}
