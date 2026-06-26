import SwiftUI

struct AppEnvironment {
    let supabaseURL: String
    let supabaseAnonKey: String
    let revenueCatAPIKey: String
    let mapboxToken: String
    let appEnvironment: String
    let aiFeatureEnabled: Bool
    let garminFeatureEnabled: Bool
    let stravaFeatureEnabled: Bool
    let mockSubscriptions: Bool
    let mockGarmin: Bool
    let mockAI: Bool

    static let development = AppEnvironment(
        supabaseURL: "",
        supabaseAnonKey: "",
        revenueCatAPIKey: "",
        mapboxToken: "",
        appEnvironment: "development",
        aiFeatureEnabled: false,
        garminFeatureEnabled: false,
        stravaFeatureEnabled: false,
        mockSubscriptions: true,
        mockGarmin: true,
        mockAI: true
    )
}

private struct AppEnvironmentKey: EnvironmentKey {
    static let defaultValue = AppEnvironment.development
}

extension EnvironmentValues {
    var appEnvironment: AppEnvironment {
        get { self[AppEnvironmentKey.self] }
        set { self[AppEnvironmentKey.self] = newValue }
    }
}
