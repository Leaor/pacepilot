import MapKit
import SwiftUI

struct WorkoutRecordingView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var recorder = LocationWorkoutService()
    @State private var position = MapCameraPosition.region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 43.6532, longitude: -79.3832),
            span: MKCoordinateSpan(latitudeDelta: 0.035, longitudeDelta: 0.035)
        )
    )
    @State private var showingSaveSheet = false

    let workout: Workout?

    init(workout: Workout? = nil) {
        self.workout = workout
    }

    var body: some View {
        ZStack {
            map
            VStack(spacing: 0) {
                header
                Spacer()
                recordingDock
            }
        }
        .background(PPColors.deepNavy.ignoresSafeArea())
        .onAppear { recorder.requestPermission() }
        .onChange(of: recorder.route.count) { _, _ in centerOnLatestRoutePoint() }
        .sheet(isPresented: $showingSaveSheet) {
            RunSaveSheet(recorder: recorder, workout: workout) { activity in
                appState.saveActivity(activity)
                dismiss()
            }
            .presentationDetents([.medium, .large])
        }
    }

    private var map: some View {
        Map(position: $position) {
            UserAnnotation()
            if let first = recorder.route.first {
                Marker("Start", systemImage: "flag.fill", coordinate: first)
                    .tint(PPColors.easyGreen)
            }
            if let last = recorder.route.last, recorder.route.count > 1 {
                Marker("Now", systemImage: "figure.run", coordinate: last)
                    .tint(PPColors.orange)
            }
            if recorder.route.count > 1 {
                MapPolyline(coordinates: recorder.route)
                    .stroke(PPColors.orange, style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
            }
        }
        .mapControls {
            MapUserLocationButton()
            MapCompass()
        }
        .ignoresSafeArea()
        .overlay(alignment: .top) {
            LinearGradient(
                colors: [PPColors.deepNavy.opacity(0.94), PPColors.deepNavy.opacity(0)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 190)
            .allowsHitTesting(false)
        }
        .overlay(alignment: .bottom) {
            LinearGradient(
                colors: [PPColors.deepNavy.opacity(0), PPColors.deepNavy.opacity(0.96)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 340)
            .allowsHitTesting(false)
        }
    }

    private var header: some View {
        HStack(spacing: PPSpacing.md) {
            PPCircleIconButton(systemImage: "xmark", label: "Close recording", color: PPColors.deepNavy.opacity(0.86)) {
                dismiss()
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(workout?.title ?? "Free Run")
                    .font(PPTypography.headline)
                    .foregroundStyle(PPColors.textWhite)
                    .lineLimit(1)
                Text(statusText)
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.textMuted)
            }

            Spacer()

            PPBadge(
                title: recorder.permissionDenied ? "GPS unavailable" : "Map run",
                color: recorder.permissionDenied ? PPColors.warning : PPColors.aiCyan,
                systemImage: recorder.permissionDenied ? "location.slash" : "location.fill"
            )
        }
        .padding(.horizontal, PPSpacing.md)
        .padding(.top, PPSpacing.lg)
    }

    private var recordingDock: some View {
        VStack(spacing: PPSpacing.md) {
            if let error = recorder.lastError {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .font(PPTypography.caption)
                    .foregroundStyle(PPColors.warning)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack(spacing: PPSpacing.sm) {
                PPCockpitMetric(title: "Time", value: formattedTime, color: PPColors.textWhite)
                PPCockpitMetric(title: "Distance", value: String(format: "%.2f km", recorder.distanceKilometers), color: PPColors.orange)
            }

            HStack(spacing: PPSpacing.sm) {
                PPCockpitMetric(title: "Current pace", value: recorder.currentPaceSecondsPerKilometer > 0 ? "\(PaceRange.format(recorder.currentPaceSecondsPerKilometer))/km" : "--", color: PPColors.aiCyan)
                PPCockpitMetric(title: "Average pace", value: recorder.averagePaceSecondsPerKilometer > 0 ? "\(PaceRange.format(recorder.averagePaceSecondsPerKilometer))/km" : "--", color: PPColors.easyGreen)
            }

            controls
        }
        .padding(PPSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(PPColors.backgroundNavy.opacity(0.96))
                .overlay(
                    RoundedRectangle(cornerRadius: 26, style: .continuous)
                        .stroke(PPColors.surfaceRaised, lineWidth: 1)
                )
        )
        .padding(PPSpacing.md)
    }

    private var controls: some View {
        HStack(spacing: PPSpacing.sm) {
            switch recorder.recordingState {
            case .idle:
                PPButton(title: "Start", systemImage: "play.fill") {
                    recorder.start()
                }
                PPCircleIconButton(systemImage: "waveform.path.ecg", label: "Load sample route", color: PPColors.surfaceLight) {
                    recorder.enableMockRecording()
                    centerOnLatestRoutePoint()
                }
            case .recording:
                PPButton(title: "Pause", systemImage: "pause.fill", role: .secondary) {
                    recorder.pause()
                }
                PPButton(title: "Finish", systemImage: "stop.fill", role: .primary) {
                    recorder.finish()
                    showingSaveSheet = true
                }
            case .paused:
                PPButton(title: "Resume", systemImage: "play.fill") {
                    recorder.resume()
                }
                PPButton(title: "Finish", systemImage: "stop.fill", role: .secondary) {
                    recorder.finish()
                    showingSaveSheet = true
                }
            case .finished:
                PPButton(title: "Save Run", systemImage: "checkmark.circle.fill") {
                    showingSaveSheet = true
                }
                PPButton(title: "Discard", systemImage: "trash", role: .quiet) {
                    dismiss()
                }
            }
        }
    }

    private var formattedTime: String {
        let hours = recorder.elapsedSeconds / 3_600
        let minutes = (recorder.elapsedSeconds % 3_600) / 60
        let seconds = recorder.elapsedSeconds % 60
        if hours > 0 {
            return "\(hours):\(String(format: "%02d", minutes)):\(String(format: "%02d", seconds))"
        }
        return "\(minutes):\(String(format: "%02d", seconds))"
    }

    private var statusText: String {
        switch recorder.recordingState {
        case .idle:
            return workout?.targetPace?.formatted ?? "Ready to record"
        case .recording:
            return "Recording live route"
        case .paused:
            return "Paused"
        case .finished:
            return "Finished - save or discard"
        }
    }

    private func centerOnLatestRoutePoint() {
        guard let latest = recorder.route.last else { return }
        position = .region(
            MKCoordinateRegion(
                center: latest,
                span: MKCoordinateSpan(latitudeDelta: 0.018, longitudeDelta: 0.018)
            )
        )
    }
}

struct RunSaveSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @ObservedObject var recorder: LocationWorkoutService
    let workout: Workout?
    let onSave: (Activity) -> Void

    @State private var perceivedEffort = 4
    @State private var fatigueAfter = 2
    @State private var selectedShoeID: UUID?
    @State private var notes = ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Run Summary") {
                    HStack {
                        Label(String(format: "%.2f km", recorder.distanceKilometers), systemImage: "point.topleft.down.curvedto.point.bottomright.up")
                        Spacer()
                        Text("\(recorder.elapsedSeconds / 60) min")
                            .foregroundStyle(PPColors.textMuted)
                    }
                    if let workout {
                        Label("Completes \(workout.title)", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(PPColors.easyGreen)
                    }
                }

                Section("How it felt") {
                    Stepper("Perceived effort: \(perceivedEffort)", value: $perceivedEffort, in: 1...10)
                    Stepper("Fatigue after: \(fatigueAfter)", value: $fatigueAfter, in: 1...5)
                    Picker("Shoe", selection: $selectedShoeID) {
                        Text("None").tag(UUID?.none)
                        ForEach(appState.shoes.filter { $0.status == .active }) { shoe in
                            Text(shoe.nickname).tag(Optional(shoe.id))
                        }
                    }
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(PPColors.error)
                    }
                }

                Section {
                    PPButton(title: "Save Run", systemImage: "checkmark.circle.fill") {
                        save()
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .navigationTitle("Finish Run")
            .toolbar {
                Button("Cancel") { dismiss() }
            }
            .onAppear {
                selectedShoeID = appState.shoes.first(where: { $0.status == .active })?.id
            }
        }
    }

    private func save() {
        guard let activity = recorder.recordedActivity(
            perceivedEffort: perceivedEffort,
            fatigueAfter: fatigueAfter,
            notes: notes,
            shoeID: selectedShoeID,
            workoutID: workout?.id
        ) else {
            errorMessage = recorder.lastError ?? "Unable to save this run."
            return
        }

        onSave(activity)
        dismiss()
    }
}
