import Foundation

struct ConnectedServiceStatus: Hashable {
    var isConnected: Bool
    var lastSync: Date?
    var message: String
}

struct StravaActionResult: Hashable {
    var title: String
    var message: String
    var destinationURL: URL?
}

struct StravaService {
    func status(isConnected: Bool = false, lastSync: Date? = nil, cachedActivities: Int = 0) -> ConnectedServiceStatus {
        let cacheSummary = cachedActivities > 0 ? " \(cachedActivities) display-only activities are cached." : ""
        return ConnectedServiceStatus(
            isConnected: isConnected,
            lastSync: lastSync,
            message: "Strava connection is optional. PacePilot displays synced Strava activities only to you.\(cacheSummary) AI coaching does not use Strava API data."
        )
    }

    func connect(environment: AppEnvironment) async -> StravaActionResult {
        do {
            let payload = try await callEdgeFunction("strava-auth-url", environment: environment, method: "GET")
            if let value = payload["authorizationUrl"] as? String, let url = URL(string: value) {
                return StravaActionResult(
                    title: "Open Strava",
                    message: "Continue in Strava to approve PacePilot display sync.",
                    destinationURL: url
                )
            }
            return StravaActionResult(title: "Strava ready", message: "The auth endpoint responded without an authorization URL.", destinationURL: nil)
        } catch {
            return StravaActionResult(title: "Strava setup needed", message: error.localizedDescription, destinationURL: nil)
        }
    }

    func disconnect(environment: AppEnvironment) async -> StravaActionResult {
        await action("strava-disconnect", title: "Strava disconnected", environment: environment)
    }

    func deleteCachedData(environment: AppEnvironment) async -> StravaActionResult {
        await action("strava-disconnect", title: "Strava cache deleted", environment: environment, body: ["deleteCachedData": true])
    }

    func export(activity: Activity, environment: AppEnvironment) async -> StravaActionResult {
        await action(
            "strava-export-activity",
            title: "Export requested",
            environment: environment,
            body: [
                "activityId": activity.id.uuidString,
                "source": activity.source.rawValue,
                "distanceKilometers": activity.distanceKilometers,
                "durationSeconds": activity.durationSeconds
            ]
        )
    }

    private func action(
        _ name: String,
        title: String,
        environment: AppEnvironment,
        body: [String: Any] = [:]
    ) async -> StravaActionResult {
        do {
            _ = try await callEdgeFunction(name, environment: environment, method: "POST", body: body)
            return StravaActionResult(title: title, message: "\(name) completed through Supabase Edge Functions.", destinationURL: nil)
        } catch {
            return StravaActionResult(title: "\(title) unavailable", message: error.localizedDescription, destinationURL: nil)
        }
    }

    private func callEdgeFunction(
        _ name: String,
        environment: AppEnvironment,
        method: String,
        body: [String: Any] = [:]
    ) async throws -> [String: Any] {
        guard environment.stravaFeatureEnabled else {
            throw StravaServiceError.featureDisabled
        }
        guard !environment.supabaseURL.isEmpty, !environment.supabaseAnonKey.isEmpty else {
            throw StravaServiceError.missingSupabaseConfiguration
        }
        guard let url = URL(string: "\(environment.supabaseURL)/functions/v1/\(name)") else {
            throw StravaServiceError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(environment.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(environment.supabaseAnonKey, forHTTPHeaderField: "apikey")

        if method != "GET" {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw StravaServiceError.invalidResponse
        }

        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        if !(200..<300).contains(httpResponse.statusCode) {
            let message = object["error"] as? String ?? "Edge Function returned \(httpResponse.statusCode)."
            throw StravaServiceError.edgeFunction(message)
        }

        return object
    }
}

enum StravaServiceError: LocalizedError {
    case featureDisabled
    case missingSupabaseConfiguration
    case invalidURL
    case invalidResponse
    case edgeFunction(String)

    var errorDescription: String? {
        switch self {
        case .featureDisabled:
            "Enable `stravaFeatureEnabled` in the app environment before connecting Strava."
        case .missingSupabaseConfiguration:
            "Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the iOS environment so PacePilot can call Strava Edge Functions."
        case .invalidURL:
            "The configured Supabase URL is invalid."
        case .invalidResponse:
            "Strava Edge Function returned an unreadable response."
        case .edgeFunction(let message):
            message
        }
    }
}
