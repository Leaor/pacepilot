import SwiftUI

struct TodayView: View {
    @EnvironmentObject private var appState: AppState
    @State private var showingLifeMode = false
    @State private var recordingContext: WorkoutRecordingContext?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: PPSpacing.lg) {
                    header
                    weekRail
                    if let workout = appState.todaysWorkout {
                        workoutCard(workout)
                    } else {
                        emptyPlanCard
                    }
                    quickAddGrid
                    metricsGrid
                    pilotTip
                }
                .padding(PPSpacing.md)
            }
            .ppTabSafeAreaPadding()
            .ppScreen()
            .navigationTitle("Today")
            .toolbar {
                Button {
                    appState.selectedTab = .coach
                } label: {
                    Image(systemName: "bubble.left.and.bubble.right.fill")
                }
            }
            .sheet(isPresented: $showingLifeMode) { LifeModeSheet() }
            .sheet(item: $recordingContext) { context in
                WorkoutRecordingView(workout: context.workout)
            }
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: PPSpacing.xs) {
                Text("Good morning,")
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)
                Text(appState.profile.name)
                    .font(PPTypography.largeTitle)
                    .foregroundStyle(PPColors.textWhite)
                Text(.now, format: .dateTime.weekday(.wide).month(.wide).day())
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)
            }
            Spacer()
            Text(appState.profile.name.prefix(2).uppercased())
                .font(.caption.weight(.black))
                .frame(width: 42, height: 42)
                .background(PPColors.surfaceLight)
                .foregroundStyle(PPColors.orange)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(PPColors.surfaceRaised, lineWidth: 1)
                )
        }
    }

    private var weekRail: some View {
        let days = Calendar.current.shortWeekdaySymbols
        let todayIndex = Calendar.current.component(.weekday, from: .now) - 1
        return HStack(spacing: PPSpacing.sm) {
            ForEach(days.indices, id: \.self) { index in
                VStack(spacing: PPSpacing.xs) {
                    Text(String(days[index].prefix(1)))
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(index == todayIndex ? PPColors.textWhite : PPColors.textMuted)
                    Circle()
                        .fill(index == todayIndex ? PPColors.orange : PPColors.aiCyan.opacity(index % 2 == 0 ? 0.9 : 0.45))
                        .frame(width: index == todayIndex ? 26 : 5, height: index == todayIndex ? 26 : 5)
                        .overlay {
                            if index == todayIndex {
                                Text("W")
                                    .font(.caption2.weight(.black))
                                    .foregroundStyle(PPColors.textWhite)
                            }
                        }
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private func workoutCard(_ workout: Workout) -> some View {
        PPCard {
            VStack(alignment: .leading, spacing: PPSpacing.md) {
                HStack {
                    PPBadge(title: workout.type.title, color: workout.type.color, systemImage: workout.type.symbolName)
                    Spacer()
                    Text(workout.status.rawValue.capitalized)
                        .font(PPTypography.caption)
                        .foregroundStyle(PPColors.textMuted)
                }
                Text(workout.title)
                    .font(PPTypography.title)
                    .foregroundStyle(PPColors.textWhite)
                Text(workout.purpose)
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)
                HStack(spacing: PPSpacing.sm) {
                    PPCockpitMetric(title: "Distance", value: workout.distanceKilometers.map { String(format: "%.1f km", $0) } ?? "Time", color: PPColors.textWhite)
                    PPCockpitMetric(title: "Est time", value: "\(workout.durationMinutes ?? 40) min", color: PPColors.aiCyan)
                    PPCockpitMetric(title: "Target", value: workout.targetPace.map { PaceRange.format($0.lowerSecondsPerKilometer) } ?? "Feel", caption: workout.targetPace == nil ? nil : "/km", color: PPColors.orange)
                }
                HStack {
                    PPButton(title: "Start workout", systemImage: "play.fill") {
                        recordingContext = WorkoutRecordingContext(workout: workout)
                    }
                    PPCircleIconButton(systemImage: "plus", label: "Record free run", color: PPColors.surfaceLight) {
                        recordingContext = WorkoutRecordingContext(workout: nil)
                    }
                }
                PPButton(title: "Life Mode", systemImage: "slider.horizontal.3", role: .quiet) {
                    showingLifeMode = true
                }
            }
        }
    }

    private var emptyPlanCard: some View {
        PPCard {
            VStack(alignment: .leading, spacing: PPSpacing.md) {
                Text("No active plan")
                    .font(PPTypography.title)
                    .foregroundStyle(PPColors.textWhite)
                Text("Create a plan from onboarding or pick a featured event.")
                    .foregroundStyle(PPColors.textMuted)
                PPButton(title: "Create Plan", systemImage: "sparkles") {
                    appState.selectedTab = .plan
                }
                PPButton(title: "Record Free Run", systemImage: "location.fill", role: .secondary) {
                    recordingContext = WorkoutRecordingContext(workout: nil)
                }
            }
        }
    }

    private var quickAddGrid: some View {
        VStack(alignment: .leading, spacing: PPSpacing.md) {
            Text("Quick Add")
                .font(PPTypography.title)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: PPSpacing.sm)], spacing: PPSpacing.sm) {
                ForEach([WorkoutType.easyRun, .tempoRun, .intervals, .hills, .longRun, .race, .recoveryRun, .strength]) { type in
                    PPCard(padding: PPSpacing.sm) {
                        VStack(alignment: .leading, spacing: PPSpacing.sm) {
                            Image(systemName: type.symbolName)
                                .foregroundStyle(type.color)
                            Text(type.title)
                                .font(PPTypography.caption)
                                .foregroundStyle(PPColors.textWhite)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
        }
        .foregroundStyle(PPColors.textWhite)
    }

    private var metricsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: PPSpacing.sm) {
            PPCard {
                HStack {
                    PPProgressRing(value: appState.weeklyDistanceCompleted / max(appState.weeklyDistanceTarget, 1), color: PPColors.easyGreen)
                        .frame(width: 76, height: 76)
                    VStack(alignment: .leading) {
                        Text("Weekly distance")
                            .font(PPTypography.headline)
                        Text(String(format: "%.1f / %.1f km", appState.weeklyDistanceCompleted, appState.weeklyDistanceTarget))
                            .font(PPTypography.caption)
                            .foregroundStyle(PPColors.textMuted)
                    }
                }
            }
            PPCard {
                VStack(alignment: .leading, spacing: PPSpacing.xs) {
                    PPCockpitMetric(title: "Completed", value: "\(appState.trainingPlan.weeks.flatMap(\.workouts).filter { $0.status == .completed }.count)", color: PPColors.textWhite)
                    PPCockpitMetric(title: "Race countdown", value: "\(Calendar.current.dateComponents([.day], from: .now, to: appState.profile.raceDate).day ?? 0)d", color: PPColors.orange)
                }
            }
        }
    }

    private var pilotTip: some View {
        PPCard {
            VStack(alignment: .leading, spacing: PPSpacing.sm) {
                PPBadge(title: "Pilot Tip", color: PPColors.aiCyan, systemImage: "sparkles")
                Text("Keep today’s easy sections genuinely easy. The plan gets smarter when the easy work stays honest.")
                    .font(PPTypography.body)
                    .foregroundStyle(PPColors.textWhite)
                HStack {
                    PPSourceChip(title: "PacePilot GPS allowed", isAllowed: appState.privacy.aiCanUsePacePilotActivityHistory)
                    PPSourceChip(title: "Strava excluded", isAllowed: false)
                }
                Text("Coach can explain synced Strava activities as display-only context, but Strava API/cache data is never sent to AI.")
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)
            }
        }
    }

    private func metric(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(PPTypography.metric)
                .foregroundStyle(PPColors.textWhite)
            Text(title)
                .font(PPTypography.caption)
                .foregroundStyle(PPColors.textMuted)
        }
    }
}

struct WorkoutRecordingContext: Identifiable {
    let id = UUID()
    var workout: Workout?
}

struct LifeModeSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var option: LifeModeOption = .missedWorkout

    var body: some View {
        NavigationStack {
            List {
                Picker("Situation", selection: $option) {
                    ForEach(LifeModeOption.allCases) { Text($0.title).tag($0) }
                }
                ForEach(LifeModeEngine.suggestions(for: option)) { suggestion in
                    VStack(alignment: .leading, spacing: PPSpacing.sm) {
                        Text(suggestion.action)
                            .font(PPTypography.headline)
                        Text(suggestion.detail)
                            .foregroundStyle(PPColors.textMuted)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .navigationTitle("Life Mode")
            .toolbar { Button("Done") { dismiss() } }
        }
    }
}
