import SwiftUI

struct PlanView: View {
    @EnvironmentObject private var appState: AppState
    @State private var selectedWorkout: Workout?
    @State private var showingCalendarExport = false
    @State private var actionResult: PlanActionResult?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: PPSpacing.lg) {
                    overview
                    ForEach(appState.trainingPlan.weeks) { week in
                        weekSection(week)
                    }
                }
                .padding(PPSpacing.md)
            }
            .ppTabSafeAreaPadding()
            .ppScreen()
            .navigationTitle("Plan")
            .toolbar {
                Button {
                    showingCalendarExport = true
                } label: {
                    Image(systemName: "calendar.badge.plus")
                }
            }
            .sheet(item: $selectedWorkout) { workout in
                WorkoutDetailSheet(workout: workout)
            }
            .sheet(isPresented: $showingCalendarExport) {
                CalendarExportSheet(plan: appState.trainingPlan)
            }
            .alert(actionResult?.title ?? "Plan", isPresented: Binding(get: { actionResult != nil }, set: { if !$0 { actionResult = nil } })) {
                Button("OK") { actionResult = nil }
            } message: {
                Text(actionResult?.message ?? "")
            }
        }
    }

    private var overview: some View {
        PPCard {
            VStack(alignment: .leading, spacing: PPSpacing.md) {
                HStack {
                    VStack(alignment: .leading, spacing: PPSpacing.xs) {
                        Text(appState.trainingPlan.name)
                            .font(PPTypography.title)
                            .foregroundStyle(PPColors.textWhite)
                        Text("A-race in \(Calendar.current.dateComponents([.day], from: .now, to: appState.trainingPlan.raceDate).day ?? 0) days")
                            .foregroundStyle(PPColors.textMuted)
                    }
                    Spacer()
                    PPProgressRing(value: 0.42, color: PPColors.orange)
                        .frame(width: 72, height: 72)
                }
                HStack {
                    PPBadge(title: "B-race support", color: PPColors.aiCyan, systemImage: "flag")
                    PPBadge(title: "Recovery weeks", color: PPColors.easyGreen, systemImage: "leaf")
                    PPBadge(title: "Taper labeled", color: PPColors.warning, systemImage: "arrow.down.forward")
                }
                .lineLimit(1)
                .minimumScaleFactor(0.72)
                HStack {
                    PPButton(title: "Regenerate Week", systemImage: "arrow.clockwise", role: .secondary) {
                        regeneratePlan()
                    }
                    PPButton(title: "Life Mode", systemImage: "slider.horizontal.3", role: .quiet) {
                        showLifeModeSuggestion()
                    }
                }
            }
        }
    }

    private func weekSection(_ week: TrainingWeek) -> some View {
        VStack(alignment: .leading, spacing: PPSpacing.sm) {
            HStack {
                Text("Week \(week.number)")
                    .font(PPTypography.title)
                PPBadge(title: week.phase.title, color: color(for: week.phase))
                Spacer()
                Text(String(format: "%.1f km", week.targetDistanceKilometers))
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)
            }
            Text(week.focus)
                .font(PPTypography.caption)
                .foregroundStyle(PPColors.textMuted)

            ForEach(week.workouts) { workout in
                Button {
                    selectedWorkout = workout
                } label: {
                    workoutRow(workout, phase: week.phase)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func workoutRow(_ workout: Workout, phase: WeekPhase) -> some View {
        PPCard(padding: PPSpacing.md) {
            HStack(spacing: PPSpacing.md) {
                VStack {
                    Text(workout.scheduledDate, format: .dateTime.weekday(.abbreviated))
                        .font(PPTypography.caption)
                        .foregroundStyle(PPColors.textMuted)
                    Text(workout.scheduledDate, format: .dateTime.day())
                        .font(PPTypography.metric)
                        .foregroundStyle(PPColors.textWhite)
                }
                .frame(width: 52)

                Image(systemName: workout.type.symbolName)
                    .foregroundStyle(workout.type.color)
                    .frame(width: 28)

                VStack(alignment: .leading, spacing: 4) {
                    Text(workout.title)
                        .font(PPTypography.headline)
                        .foregroundStyle(PPColors.textWhite)
                    Text(workout.distanceKilometers.map { String(format: "%.1f km", $0) } ?? "\(workout.durationMinutes ?? 0) min")
                        .font(PPTypography.caption)
                        .foregroundStyle(PPColors.textMuted)
                }
                Spacer()
                if workout.isLongRun {
                    PPBadge(title: "Long", color: PPColors.longRunPurple)
                } else if phase == .race {
                    PPBadge(title: "Race", color: PPColors.raceOrange)
                }
            }
        }
    }

    private func color(for phase: WeekPhase) -> Color {
        switch phase {
        case .base: PPColors.aiCyan
        case .build: PPColors.orange
        case .recovery: PPColors.easyGreen
        case .deload: PPColors.warning
        case .taper: PPColors.longRunPurple
        case .race: PPColors.raceOrange
        }
    }

    private func regeneratePlan() {
        let aRace = appState.trainingPlan.aRace
        let bRace = appState.trainingPlan.bRace
        var regeneratedPlan = TrainingPlanService().generateDemoPlan(for: appState.profile)
        regeneratedPlan.aRace = aRace
        regeneratedPlan.bRace = bRace
        appState.trainingPlan = regeneratedPlan
        actionResult = PlanActionResult(title: "Plan regenerated", message: "Your plan was rebuilt from the current profile, race date, and training preferences.")
    }

    private func showLifeModeSuggestion() {
        if let latestCheckIn = appState.checkIns.sorted(by: { $0.date > $1.date }).first {
            actionResult = PlanActionResult(title: "Life Mode", message: WeeklyAdjustmentEngine.nextWeekAdjustment(from: latestCheckIn))
            return
        }

        let suggestion = LifeModeEngine.suggestions(for: .busyWeek).first
        actionResult = PlanActionResult(
            title: "Life Mode",
            message: [suggestion?.action, suggestion?.detail].compactMap { $0 }.joined(separator: ": ")
        )
    }
}

private struct PlanActionResult: Identifiable, Hashable {
    let id = UUID()
    var title: String
    var message: String
}

struct WorkoutDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    let workout: Workout
    @State private var recordingContext: WorkoutRecordingContext?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(workout.purpose)
                    if let pace = workout.targetPace {
                        Label(pace.formatted, systemImage: "speedometer")
                    }
                    if let distance = workout.distanceKilometers {
                        Label(String(format: "%.1f km", distance), systemImage: "point.topleft.down.curvedto.point.bottomright.up")
                    }
                }
                Section("Steps") {
                    ForEach(workout.steps) { step in
                        VStack(alignment: .leading) {
                            Text(step.title)
                                .font(PPTypography.headline)
                            Text(step.detail)
                                .foregroundStyle(PPColors.textMuted)
                        }
                    }
                }
                Section("Actions") {
                    Button("Start workout") {
                        recordingContext = WorkoutRecordingContext(workout: workout)
                    }
                    Button("Mark completed") {
                        appState.trainingPlan.updateWorkout(workout.id, status: .completed)
                        dismiss()
                    }
                    Button("Mark skipped") {
                        appState.trainingPlan.updateWorkout(workout.id, status: .skipped)
                        dismiss()
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .ppTabSafeAreaPadding()
            .navigationTitle(workout.title)
            .toolbar { Button("Done") { dismiss() } }
            .sheet(item: $recordingContext) { context in
                WorkoutRecordingView(workout: context.workout)
            }
        }
    }
}

struct CalendarExportSheet: View {
    @Environment(\.dismiss) private var dismiss
    let plan: TrainingPlan

    var body: some View {
        NavigationStack {
            ScrollView {
                Text(CalendarExportService().ics(for: plan))
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(PPColors.textMuted)
                    .padding(PPSpacing.md)
            }
            .ppTabSafeAreaPadding()
            .ppScreen()
            .navigationTitle("Calendar Export")
            .toolbar { Button("Done") { dismiss() } }
        }
    }
}
