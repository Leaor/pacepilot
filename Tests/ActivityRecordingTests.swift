import CoreLocation
import XCTest
@testable import PacePilot

@MainActor
final class ActivityRecordingTests: XCTestCase {
    func testRecordingMetricsCalculateDistanceAndPace() {
        let start = Date(timeIntervalSince1970: 0)
        let points = [
            ActivityRoutePoint(latitude: 43.6532, longitude: -79.3832, recordedAt: start),
            ActivityRoutePoint(latitude: 43.6622, longitude: -79.3832, recordedAt: start.addingTimeInterval(600))
        ]

        let metrics = LocationWorkoutService.metrics(points: points, elapsedSeconds: 600)

        XCTAssertGreaterThan(metrics.distanceKilometers, 0.9)
        XCTAssertLessThan(metrics.distanceKilometers, 1.1)
        XCTAssertGreaterThan(metrics.averagePaceSecondsPerKilometer, 540)
        XCTAssertLessThan(metrics.averagePaceSecondsPerKilometer, 680)
        XCTAssertEqual(metrics.currentPaceSecondsPerKilometer, metrics.averagePaceSecondsPerKilometer)
    }

    func testMockRecorderBuildsSaveableGpsActivity() {
        let recorder = LocationWorkoutService()
        let workoutID = UUID()

        recorder.enableMockRecording()
        let activity = recorder.recordedActivity(
            perceivedEffort: 4,
            fatigueAfter: 2,
            notes: "Controlled test run.",
            shoeID: nil,
            workoutID: workoutID
        )

        XCTAssertEqual(activity?.source, .pacepilotGPS)
        XCTAssertEqual(activity?.workoutID, workoutID)
        XCTAssertEqual(activity?.route.count, 4)
        XCTAssertEqual(activity?.durationSeconds, 1_482)
    }

    func testSplitsPreserveKilometersAcrossLongSegments() {
        let start = Date(timeIntervalSince1970: 0)
        let points = [
            ActivityRoutePoint(latitude: 43.6532, longitude: -79.3832, recordedAt: start),
            ActivityRoutePoint(latitude: 43.6802, longitude: -79.3832, recordedAt: start.addingTimeInterval(1_500))
        ]

        let splits = LocationWorkoutService.splits(from: points)

        XCTAssertGreaterThanOrEqual(splits.count, 2)
        XCTAssertEqual(splits[0].kilometer, 1)
        XCTAssertEqual(splits[1].kilometer, 2)
        XCTAssertGreaterThan(splits[0].paceSeconds, 0)
        XCTAssertGreaterThan(splits[1].paceSeconds, 0)
    }

    func testSavingActivityCompletesWorkoutAndUpdatesShoeMileage() throws {
        let appState = AppState()
        let workout = try XCTUnwrap(appState.todaysWorkout)
        let shoe = try XCTUnwrap(appState.shoes.first)
        let initialMileage = shoe.currentMileage
        let activity = Activity(
            id: UUID(),
            workoutID: workout.id,
            source: .pacepilotGPS,
            startedAt: .now,
            distanceKilometers: 3.5,
            durationSeconds: 1_260,
            elevationMeters: 0,
            averageHeartRate: nil,
            perceivedEffort: 4,
            fatigueAfter: 2,
            notes: "Saved from recorder.",
            shoeID: shoe.id,
            splits: [],
            route: []
        )

        appState.saveActivity(activity)

        XCTAssertEqual(appState.activities.first?.id, activity.id)
        XCTAssertEqual(
            appState.trainingPlan.weeks.flatMap(\.workouts).first { $0.id == workout.id }?.status,
            .completed
        )
        XCTAssertEqual(appState.shoes.first { $0.id == shoe.id }?.currentMileage, initialMileage + 3.5)
    }
}
