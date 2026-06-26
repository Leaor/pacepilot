import XCTest
@testable import PacePilot

final class AIDataPolicyTests: XCTestCase {
    func testAlwaysExcludesStravaCache() {
        let result = AIDataPolicy.filter(activitySources: [.pacepilotGPS, .stravaCache], privacy: .demo)

        XCTAssertTrue(result.allowedSources.contains(.pacepilotGPS))
        XCTAssertTrue(result.excludedSources.contains(.stravaCache))
        XCTAssertFalse(ActivitySource.stravaCache.canPowerCoaching)
    }

    func testPrivacyPreferenceExcludesGarminWithoutConsent() {
        var privacy = PrivacyPreferences.demo
        privacy.aiCanUseGarminData = false

        let result = AIDataPolicy.filter(activitySources: [.garminImport], privacy: privacy)
        XCTAssertEqual(result.allowedSources, [])
        XCTAssertEqual(result.excludedSources, [.garminImport])
    }
}
