import Foundation

enum StravaIntegration {
    static let edgeFunctions = [
        "strava-auth-url",
        "strava-callback",
        "strava-refresh-token",
        "strava-disconnect",
        "strava-webhook",
        "strava-export-activity"
    ]

    static let aiRestriction = "Strava API and cached data are display only and excluded from AI coaching, plan generation, and advanced analytics."
}
