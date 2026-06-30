import MapKit
import SwiftUI

struct ActivitiesView: View {
    @EnvironmentObject private var appState: AppState
    @State private var selectedActivity: Activity?
    @State private var showingManualEntry = false
    @State private var recordingContext: WorkoutRecordingContext?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: PPSpacing.md) {
                    header
                    HStack {
                        PPButton(title: "Manual Run", systemImage: "square.and.pencil") {
                            showingManualEntry = true
                        }
                        PPButton(title: "GPS", systemImage: "location.fill", role: .secondary) {
                            recordingContext = WorkoutRecordingContext(workout: nil)
                        }
                    }

                    monthlySummary

                    ForEach(appState.activities) { activity in
                        Button {
                            selectedActivity = activity
                        } label: {
                            ActivityRow(activity: activity)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(PPSpacing.md)
            }
            .ppTabSafeAreaPadding()
            .ppScreen()
            .navigationTitle("Activities")
            .sheet(item: $selectedActivity) { ActivityDetailView(activity: $0) }
            .sheet(isPresented: $showingManualEntry) { ManualRunEntryView() }
            .sheet(item: $recordingContext) { context in
                WorkoutRecordingView(workout: context.workout)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: PPSpacing.xs) {
            Text("Run Log")
                .font(PPTypography.largeTitle)
                .foregroundStyle(PPColors.textWhite)
            Text("PacePilot runs can power Coach when you consent. Strava Sync remains display-only.")
                .font(PPTypography.caption)
                .foregroundStyle(PPColors.textMuted)
        }
    }

    private var monthlySummary: some View {
        PPCard {
            HStack(spacing: PPSpacing.sm) {
                PPCockpitMetric(title: "This week", value: String(format: "%.1f km", appState.weeklyDistanceCompleted), color: PPColors.easyGreen)
                PPCockpitMetric(title: "Activities", value: "\(appState.activities.count)", color: PPColors.aiCyan)
                PPCockpitMetric(title: "Strava cache", value: "\(appState.stravaActivities().count)", color: PPColors.warning)
            }
        }
    }
}

struct ActivityRow: View {
    let activity: Activity

    var body: some View {
        PPCard(padding: PPSpacing.md) {
            HStack(spacing: PPSpacing.md) {
                Image(systemName: iconName)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(activity.source == .stravaCache ? PPColors.warning : PPColors.orange)
                    .frame(width: 36, height: 36)
                    .background(PPColors.surfaceLight)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                VStack(alignment: .leading, spacing: 4) {
                    Text(String(format: "%.1f km Run", activity.distanceKilometers))
                        .font(PPTypography.headline)
                        .foregroundStyle(PPColors.textWhite)
                    Text(activity.source.title)
                        .font(PPTypography.caption)
                        .foregroundStyle(PPColors.textMuted)
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text(PaceRange.format(activity.averagePaceSecondsPerKilometer))
                        .font(PPTypography.caption)
                        .foregroundStyle(PPColors.textWhite)
                    Text(activity.source == .stravaCache ? "Display only" : "RPE \(activity.perceivedEffort)")
                        .font(PPTypography.caption)
                        .foregroundStyle(activity.source == .stravaCache ? PPColors.warning : PPColors.textMuted)
                }
            }
        }
    }

    private var iconName: String {
        switch activity.source {
        case .pacepilotGPS: "location.fill"
        case .stravaCache: "bolt.horizontal.circle.fill"
        default: "figure.run"
        }
    }
}

struct ActivityDetailView: View {
    @Environment(\.appEnvironment) private var environment
    let activity: Activity
    @State private var stravaResult: StravaActionResult?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: PPSpacing.md) {
                    if !activity.route.isEmpty {
                        routeMap
                    }

                    PPCard {
                        VStack(alignment: .leading, spacing: PPSpacing.md) {
                            HStack {
                                PPBadge(title: activity.source.title, color: activity.source == .stravaCache ? PPColors.warning : PPColors.aiCyan, systemImage: "tag")
                                Spacer()
                                Text(activity.startedAt, format: .dateTime.month().day().hour().minute())
                                    .font(PPTypography.caption)
                                    .foregroundStyle(PPColors.textMuted)
                            }
                            HStack(spacing: PPSpacing.sm) {
                                PPCockpitMetric(title: "Distance", value: String(format: "%.2f km", activity.distanceKilometers), color: PPColors.orange)
                                PPCockpitMetric(title: "Time", value: "\(activity.durationSeconds / 60) min", color: PPColors.textWhite)
                                PPCockpitMetric(title: "Avg pace", value: "\(PaceRange.format(activity.averagePaceSecondsPerKilometer))/km", color: PPColors.easyGreen)
                            }
                            Label(activity.averageHeartRate.map { "\($0) bpm" } ?? "Heart rate not recorded", systemImage: "heart")
                                .foregroundStyle(PPColors.textMuted)
                            Label("Effort \(activity.perceivedEffort), fatigue \(activity.fatigueAfter)", systemImage: "gauge.with.dots.needle.bottom.50percent")
                                .foregroundStyle(PPColors.textMuted)
                        }
                    }

                    PPCard {
                        VStack(alignment: .leading, spacing: PPSpacing.sm) {
                            Text("Notes")
                                .font(PPTypography.title)
                            Text(activity.notes.isEmpty ? "No notes added." : activity.notes)
                                .foregroundStyle(PPColors.textMuted)
                        }
                    }

                    splits

                    if activity.source == .pacepilotGPS {
                        PPButton(title: "Export to Strava", systemImage: "square.and.arrow.up") {
                            Task {
                                stravaResult = await StravaService().export(activity: activity, environment: environment, supabase: supabaseService())
                            }
                        }
                    } else if activity.source == .stravaCache {
                        PPCard {
                            VStack(alignment: .leading, spacing: PPSpacing.sm) {
                                PPSourceChip(title: "Strava excluded from AI", isAllowed: false)
                                Text("This activity is display-only. PacePilot Coach will not use Strava API/cache data in prompts.")
                                    .font(PPTypography.caption)
                                    .foregroundStyle(PPColors.textMuted)
                            }
                        }
                    }
                }
                .padding(PPSpacing.md)
            }
            .ppTabSafeAreaPadding()
            .ppScreen()
            .navigationTitle("Activity")
            .alert(stravaResult?.title ?? "Strava", isPresented: Binding(get: { stravaResult != nil }, set: { if !$0 { stravaResult = nil } })) {
                Button("OK") { stravaResult = nil }
            } message: {
                Text(stravaResult?.message ?? "")
            }
        }
    }

    private func supabaseService() -> SupabaseService {
        SupabaseService(
            configuration: SupabaseConfiguration(
                url: environment.supabaseURL,
                anonKey: environment.supabaseAnonKey
            )
        )
    }

    private var routeMap: some View {
        Map(initialPosition: .region(mapRegion)) {
            if let first = activity.route.first {
                Marker("Start", systemImage: "flag.fill", coordinate: first.coordinate)
                    .tint(PPColors.easyGreen)
            }
            if let last = activity.route.last {
                Marker("Finish", systemImage: "flag.checkered", coordinate: last.coordinate)
                    .tint(PPColors.orange)
            }
            MapPolyline(coordinates: activity.route.map(\.coordinate))
                .stroke(PPColors.orange, style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
        }
        .frame(height: 240)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(PPColors.surfaceRaised, lineWidth: 1)
        )
    }

    private var splits: some View {
        PPCard {
            VStack(alignment: .leading, spacing: PPSpacing.sm) {
                Text("Splits")
                    .font(PPTypography.title)
                if activity.splits.isEmpty {
                    Text("No splits recorded.")
                        .font(PPTypography.caption)
                        .foregroundStyle(PPColors.textMuted)
                } else {
                    ForEach(activity.splits) { split in
                        HStack {
                            Text("Km \(split.kilometer)")
                            Spacer()
                            Text(PaceRange.format(split.paceSeconds))
                                .foregroundStyle(PPColors.orange)
                        }
                    }
                }
            }
        }
    }

    private var mapRegion: MKCoordinateRegion {
        guard !activity.route.isEmpty else {
            return MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 43.6532, longitude: -79.3832),
                span: MKCoordinateSpan(latitudeDelta: 0.035, longitudeDelta: 0.035)
            )
        }

        let latitudes = activity.route.map(\.latitude)
        let longitudes = activity.route.map(\.longitude)
        let center = CLLocationCoordinate2D(
            latitude: ((latitudes.min() ?? 0) + (latitudes.max() ?? 0)) / 2,
            longitude: ((longitudes.min() ?? 0) + (longitudes.max() ?? 0)) / 2
        )
        return MKCoordinateRegion(
            center: center,
            span: MKCoordinateSpan(
                latitudeDelta: max((latitudes.max() ?? center.latitude) - (latitudes.min() ?? center.latitude), 0.01) * 1.8,
                longitudeDelta: max((longitudes.max() ?? center.longitude) - (longitudes.min() ?? center.longitude), 0.01) * 1.8
            )
        )
    }
}

struct ManualRunEntryView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var service = ActivityService()
    @State private var distance = 5.0
    @State private var duration = 30
    @State private var effort = 4
    @State private var fatigue = 2
    @State private var shoeID: UUID?

    var body: some View {
        NavigationStack {
            Form {
                Section("Run") {
                    Stepper(String(format: "Distance: %.1f km", distance), value: $distance, in: 0.1...80, step: 0.1)
                    Stepper("Duration: \(duration) min", value: $duration, in: 1...600)
                    Stepper("Perceived effort: \(effort)", value: $effort, in: 1...10)
                    Stepper("Fatigue after: \(fatigue)", value: $fatigue, in: 1...5)
                    Picker("Shoe", selection: $shoeID) {
                        Text("None").tag(UUID?.none)
                        ForEach(appState.shoes) { shoe in
                            Text(shoe.nickname).tag(Optional(shoe.id))
                        }
                    }
                    TextField("Notes", text: $service.draftNotes, axis: .vertical)
                }
                Section {
                    PPButton(title: "Save Run", systemImage: "checkmark.circle.fill") {
                        var activity = service.manualActivity(distanceKilometers: distance, durationMinutes: duration, shoeID: shoeID)
                        activity.perceivedEffort = effort
                        activity.fatigueAfter = fatigue
                        appState.saveActivity(activity)
                        dismiss()
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .navigationTitle("Manual Run")
            .toolbar { Button("Cancel") { dismiss() } }
        }
    }
}
