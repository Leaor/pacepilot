import CoreLocation
import Combine
import Foundation
import MapKit

enum RecordingState: String {
    case idle
    case recording
    case paused
    case finished
}

struct WorkoutRecordingMetrics: Hashable {
    var distanceKilometers: Double
    var currentPaceSecondsPerKilometer: Int
    var averagePaceSecondsPerKilometer: Int
}

@MainActor
final class LocationWorkoutService: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var recordingState: RecordingState = .idle
    @Published var elapsedSeconds = 0
    @Published var distanceKilometers = 0.0
    @Published var currentPaceSecondsPerKilometer = 0
    @Published var averagePaceSecondsPerKilometer = 0
    @Published var route: [CLLocationCoordinate2D] = []
    @Published var routePoints: [ActivityRoutePoint] = []
    @Published var permissionDenied = false
    @Published var lastError: String?

    private let manager = CLLocationManager()
    private var timer: Timer?
    private var activeStartedAt: Date?
    private var accumulatedElapsedSeconds = 0
    private var recordingStartedAt: Date?

    override init() {
        super.init()
        manager.delegate = self
        manager.activityType = .fitness
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 5
    }

    func requestPermission() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            permissionDenied = true
        default:
            permissionDenied = false
        }
    }

    func start() {
        requestPermission()
        recordingState = .recording
        elapsedSeconds = 0
        accumulatedElapsedSeconds = 0
        activeStartedAt = .now
        recordingStartedAt = .now
        distanceKilometers = 0
        currentPaceSecondsPerKilometer = 0
        averagePaceSecondsPerKilometer = 0
        route = []
        routePoints = []
        lastError = nil
        startTimer()
        if !permissionDenied {
            manager.startUpdatingLocation()
        }
    }

    func pause() {
        refreshElapsedTime()
        if let activeStartedAt {
            accumulatedElapsedSeconds += Int(Date().timeIntervalSince(activeStartedAt))
        }
        activeStartedAt = nil
        recordingState = .paused
        stopTimer()
        manager.stopUpdatingLocation()
    }

    func resume() {
        guard recordingState == .paused else { return }
        recordingState = .recording
        activeStartedAt = .now
        startTimer()
        if !permissionDenied {
            manager.startUpdatingLocation()
        }
    }

    func finish() {
        refreshElapsedTime()
        if recordingState == .recording, let activeStartedAt {
            accumulatedElapsedSeconds += Int(Date().timeIntervalSince(activeStartedAt))
        }
        activeStartedAt = nil
        recordingState = .finished
        stopTimer()
        manager.stopUpdatingLocation()
    }

    func enableMockRecording() {
        permissionDenied = true
        recordingState = .paused
        recordingStartedAt = Calendar.current.date(byAdding: .minute, value: -25, to: .now)
        elapsedSeconds = 1_482
        distanceKilometers = 5.02
        currentPaceSecondsPerKilometer = 296
        averagePaceSecondsPerKilometer = 295
        let baseDate = recordingStartedAt ?? .now
        routePoints = [
            ActivityRoutePoint(latitude: 43.6532, longitude: -79.3832, recordedAt: baseDate),
            ActivityRoutePoint(latitude: 43.6581, longitude: -79.3812, recordedAt: baseDate.addingTimeInterval(500)),
            ActivityRoutePoint(latitude: 43.6628, longitude: -79.3774, recordedAt: baseDate.addingTimeInterval(1_000)),
            ActivityRoutePoint(latitude: 43.6654, longitude: -79.3718, recordedAt: baseDate.addingTimeInterval(1_482))
        ]
        route = routePoints.map(\.coordinate)
    }

    func recordedActivity(
        perceivedEffort: Int,
        fatigueAfter: Int,
        notes: String,
        shoeID: UUID?,
        workoutID: UUID?
    ) -> Activity? {
        guard elapsedSeconds > 0 else {
            lastError = "Start recording before saving the run."
            return nil
        }

        return Activity(
            id: UUID(),
            workoutID: workoutID,
            source: .pacepilotGPS,
            startedAt: recordingStartedAt ?? .now,
            distanceKilometers: distanceKilometers,
            durationSeconds: elapsedSeconds,
            elevationMeters: 0,
            averageHeartRate: nil,
            perceivedEffort: perceivedEffort,
            fatigueAfter: fatigueAfter,
            notes: notes,
            shoeID: shoeID,
            splits: Self.splits(from: routePoints),
            route: routePoints
        )
    }

    static func metrics(points: [ActivityRoutePoint], elapsedSeconds: Int) -> WorkoutRecordingMetrics {
        let distanceKilometers = totalDistanceKilometers(points)
        let averagePace = distanceKilometers > 0 ? Int(Double(elapsedSeconds) / distanceKilometers) : 0
        let currentPace = currentPaceSecondsPerKilometer(points)
        return WorkoutRecordingMetrics(
            distanceKilometers: distanceKilometers,
            currentPaceSecondsPerKilometer: currentPace,
            averagePaceSecondsPerKilometer: averagePace
        )
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            permissionDenied = manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            self.process(locations)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.lastError = "GPS update failed. PacePilot kept your timer running."
        }
    }

    private func process(_ locations: [CLLocation]) {
        guard recordingState == .recording else { return }
        let usableLocations = locations.filter { location in
            location.horizontalAccuracy >= 0 && location.horizontalAccuracy <= 50
        }

        for location in usableLocations {
            guard shouldAppend(location.coordinate) else { continue }
            let point = ActivityRoutePoint(coordinate: location.coordinate, recordedAt: location.timestamp)
            routePoints.append(point)
            route.append(location.coordinate)
        }

        refreshMetrics()
    }

    private func shouldAppend(_ coordinate: CLLocationCoordinate2D) -> Bool {
        guard let last = routePoints.last else { return true }
        let previous = CLLocation(latitude: last.latitude, longitude: last.longitude)
        let current = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        return current.distance(from: previous) >= 3
    }

    private func startTimer() {
        stopTimer()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor [self] in
                self.refreshElapsedTime()
                self.refreshMetrics()
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func refreshElapsedTime() {
        guard let activeStartedAt else {
            elapsedSeconds = accumulatedElapsedSeconds
            return
        }
        elapsedSeconds = accumulatedElapsedSeconds + Int(Date().timeIntervalSince(activeStartedAt))
    }

    private func refreshMetrics() {
        let metrics = Self.metrics(points: routePoints, elapsedSeconds: elapsedSeconds)
        distanceKilometers = metrics.distanceKilometers
        currentPaceSecondsPerKilometer = metrics.currentPaceSecondsPerKilometer
        averagePaceSecondsPerKilometer = metrics.averagePaceSecondsPerKilometer
    }

    private static func totalDistanceKilometers(_ points: [ActivityRoutePoint]) -> Double {
        guard points.count > 1 else { return 0 }
        let meters = zip(points, points.dropFirst()).reduce(0.0) { partial, pair in
            let first = CLLocation(latitude: pair.0.latitude, longitude: pair.0.longitude)
            let second = CLLocation(latitude: pair.1.latitude, longitude: pair.1.longitude)
            return partial + second.distance(from: first)
        }
        return meters / 1_000
    }

    private static func currentPaceSecondsPerKilometer(_ points: [ActivityRoutePoint]) -> Int {
        guard points.count > 1, let previous = points.dropLast().last, let last = points.last else {
            return 0
        }
        let firstLocation = CLLocation(latitude: previous.latitude, longitude: previous.longitude)
        let secondLocation = CLLocation(latitude: last.latitude, longitude: last.longitude)
        let kilometers = secondLocation.distance(from: firstLocation) / 1_000
        let seconds = last.recordedAt.timeIntervalSince(previous.recordedAt)
        guard kilometers > 0, seconds > 0 else { return 0 }
        return Int(seconds / kilometers)
    }

    static func splits(from points: [ActivityRoutePoint]) -> [ActivitySplit] {
        guard points.count > 1 else { return [] }

        var splits: [ActivitySplit] = []
        var kilometer = 1
        var accumulatedDistance = 0.0
        var splitStartTime = points[0].recordedAt

        for pair in zip(points, points.dropFirst()) {
            let firstLocation = CLLocation(latitude: pair.0.latitude, longitude: pair.0.longitude)
            let secondLocation = CLLocation(latitude: pair.1.latitude, longitude: pair.1.longitude)
            let segmentKilometers = secondLocation.distance(from: firstLocation) / 1_000
            guard segmentKilometers > 0 else { continue }

            let segmentStartDistance = accumulatedDistance
            let segmentEndDistance = accumulatedDistance + segmentKilometers
            let segmentDuration = pair.1.recordedAt.timeIntervalSince(pair.0.recordedAt)

            while segmentEndDistance >= Double(kilometer) {
                let targetDistance = Double(kilometer)
                let segmentFraction = (targetDistance - segmentStartDistance) / segmentKilometers
                let splitTime = pair.0.recordedAt.addingTimeInterval(segmentDuration * segmentFraction)
                let elapsed = max(1, Int(splitTime.timeIntervalSince(splitStartTime).rounded()))
                splits.append(ActivitySplit(kilometer: kilometer, paceSeconds: elapsed))
                kilometer += 1
                splitStartTime = splitTime
            }

            accumulatedDistance = segmentEndDistance
        }

        return splits
    }
}
