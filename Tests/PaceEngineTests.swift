import XCTest
@testable import PacePilot

final class PaceEngineTests: XCTestCase {
    func testPaceZonesUseTrustedPacePilotRaceResult() {
        let result = RecentRaceResult(distanceKilometers: 5, timeSeconds: 1_500, source: .pacepilotManual)
        let zones = PaceEngine.zones(from: result, goalDistanceKilometers: 10, goalTimeSeconds: nil)

        XCTAssertGreaterThan(zones.easy.lowerSecondsPerKilometer, zones.race.lowerSecondsPerKilometer)
        XCTAssertLessThan(zones.interval.lowerSecondsPerKilometer, zones.race.lowerSecondsPerKilometer)
    }

    func testPaceZonesIgnoreStravaCache() {
        let strava = RecentRaceResult(distanceKilometers: 5, timeSeconds: 900, source: .stravaCache)
        let zones = PaceEngine.zones(from: strava, goalDistanceKilometers: 10, goalTimeSeconds: 3_000)

        XCTAssertEqual(zones.race.lowerSecondsPerKilometer, 300)
    }
}
