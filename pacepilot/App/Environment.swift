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

    var isProduction: Bool {
        ["production", "prod"].contains(appEnvironment.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())
    }

    var allowsMockAI: Bool {
        mockAI && !isProduction
    }

    var allowsMockSubscriptions: Bool {
        mockSubscriptions && !isProduction
    }

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

    static func runtime(
        bundle: Bundle = .main,
        processEnvironment: [String: String] = ProcessInfo.processInfo.environment
    ) -> AppEnvironment {
        func value(for keys: [String]) -> String {
            for key in keys {
                if let environmentValue = processEnvironment[key]?.trimmingCharacters(in: .whitespacesAndNewlines),
                   !environmentValue.isEmpty,
                   !environmentValue.contains("$(") {
                    return environmentValue
                }
                if let bundleValue = (bundle.object(forInfoDictionaryKey: key) as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
                   !bundleValue.isEmpty,
                   !bundleValue.contains("$(") {
                    return bundleValue
                }
            }

            return ""
        }

        func value(_ keys: String...) -> String {
            value(for: keys)
        }

        func bool(_ keys: String..., default defaultValue: Bool) -> Bool {
            let raw = value(for: keys)
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .lowercased()

            if raw.isEmpty {
                return defaultValue
            }

            return ["1", "true", "yes", "on"].contains(raw)
        }

        let appEnvironment = value("APP_ENV").isEmpty ? "development" : value("APP_ENV")
        let isProductionEnvironment = ["production", "prod"].contains(appEnvironment.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())
        let mockDefault = !isProductionEnvironment

        return AppEnvironment(
            supabaseURL: value("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL"),
            supabaseAnonKey: value("SUPABASE_ANON_KEY", "EXPO_PUBLIC_SUPABASE_ANON_KEY"),
            revenueCatAPIKey: value("REVENUECAT_IOS_API_KEY"),
            mapboxToken: value("MAPBOX_TOKEN"),
            appEnvironment: appEnvironment,
            aiFeatureEnabled: bool("AI_FEATURE_ENABLED", default: false),
            garminFeatureEnabled: bool("GARMIN_FEATURE_ENABLED", default: false),
            stravaFeatureEnabled: bool("STRAVA_FEATURE_ENABLED", default: false),
            mockSubscriptions: bool("MOCK_SUBSCRIPTIONS", "EXPO_PUBLIC_MOCK_SUBSCRIPTIONS", default: mockDefault),
            mockGarmin: bool("MOCK_GARMIN", default: mockDefault),
            mockAI: bool("MOCK_AI", default: mockDefault)
        )
    }
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
