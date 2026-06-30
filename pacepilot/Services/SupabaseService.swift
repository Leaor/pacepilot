import Foundation

#if canImport(Supabase)
import Supabase
#endif

struct SupabaseConfiguration: Hashable {
    var url: String
    var anonKey: String

    private static let placeholderKeys = Set(["not-configured", "placeholder-anon-key"])
    private static let placeholderHosts = Set(["pacepilot-not-configured.invalid", "pacepilot-placeholder.supabase.co"])

    var normalizedURL: String {
        url.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var normalizedAnonKey: String {
        anonKey.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var isUsable: Bool {
        isUsableURL && isUsableAnonKey
    }

    func edgeFunctionURL(named name: String) -> URL? {
        guard isUsable, var components = URLComponents(string: normalizedURL) else {
            return nil
        }

        let basePath = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        components.path = ([basePath].filter { !$0.isEmpty } + ["functions", "v1", name]).joined(separator: "/")
        components.path = "/" + components.path
        return components.url
    }

    func restTableURL(for table: SupabaseTable) -> URL? {
        restTableURL(named: table.rawValue)
    }

    func restTableURL(named table: String) -> URL? {
        let normalizedTable = table.trimmingCharacters(in: CharacterSet(charactersIn: "/ \n\t"))
        guard isUsable,
              !normalizedTable.isEmpty,
              !normalizedTable.contains("/"),
              var components = URLComponents(string: normalizedURL) else {
            return nil
        }

        let basePath = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        components.path = ([basePath].filter { !$0.isEmpty } + ["rest", "v1", normalizedTable]).joined(separator: "/")
        components.path = "/" + components.path
        return components.url
    }

    private var isUsableURL: Bool {
        guard let components = URLComponents(string: normalizedURL),
              let scheme = components.scheme?.lowercased(),
              let host = components.host?.lowercased(),
              !Self.placeholderHosts.contains(host),
              !normalizedURL.contains("$(") else {
            return false
        }

        if scheme == "https" {
            return true
        }

        return scheme == "http" && Self.isLocalSupabaseHost(host)
    }

    private var isUsableAnonKey: Bool {
        normalizedAnonKey.count >= 20
            && !Self.placeholderKeys.contains(normalizedAnonKey)
            && !normalizedAnonKey.contains("$(")
    }

    private static func isLocalSupabaseHost(_ host: String) -> Bool {
        host == "localhost" || host == "127.0.0.1" || host == "::1"
    }
}

enum SupabaseTable: String {
    case profiles
    case subscriptions
    case trainingPlans = "training_plans"
    case workouts
    case activities
    case checkins
    case shoes
    case raceStrategies = "race_strategies"
    case aiChatThreads = "ai_chat_threads"
    case privacyPreferences = "user_privacy_preferences"
    case supportRequests = "support_requests"
}

struct AuthenticatedSupabaseSession: Hashable {
    var accessToken: String
    var userId: String
}

final class SupabaseService {
    let configuration: SupabaseConfiguration

    #if canImport(Supabase)
    let client: SupabaseClient?
    #endif

    init(configuration: SupabaseConfiguration) {
        self.configuration = configuration
        #if canImport(Supabase)
        if configuration.isUsable, let url = URL(string: configuration.normalizedURL) {
            self.client = SupabaseClient(
                supabaseURL: url,
                supabaseKey: configuration.normalizedAnonKey,
                options: SupabaseClientOptions(
                    auth: .init(redirectToURL: URL(string: "pacepilot://auth/callback"), flowType: .pkce)
                )
            )
        } else {
            self.client = nil
        }
        #endif
    }

    func isConfigured() -> Bool {
        #if canImport(Supabase)
        configuration.isUsable && client != nil
        #else
        configuration.isUsable
        #endif
    }

    func authenticatedAccessToken() async throws -> String {
        try await authenticatedSession().accessToken
    }

    func authenticatedSession() async throws -> AuthenticatedSupabaseSession {
        guard isConfigured() else {
            throw SupabaseServiceError.missingConfiguration
        }

        #if canImport(Supabase)
        guard let client else {
            throw SupabaseServiceError.missingConfiguration
        }

        let session = try await client.auth.session
        guard !session.accessToken.isEmpty, session.accessToken != configuration.normalizedAnonKey else {
            throw SupabaseServiceError.authenticationRequired
        }

        return AuthenticatedSupabaseSession(
            accessToken: session.accessToken,
            userId: session.user.id.uuidString
        )
        #else
        throw SupabaseServiceError.authenticationRequired
        #endif
    }

    @discardableResult
    func signIn(email: String, password: String) async throws -> String {
        guard isConfigured() else {
            throw SupabaseServiceError.missingConfiguration
        }

        #if canImport(Supabase)
        guard let client else {
            throw SupabaseServiceError.missingConfiguration
        }

        let session = try await client.auth.signIn(email: email, password: password)
        return session.user.email ?? email
        #else
        throw SupabaseServiceError.authenticationRequired
        #endif
    }

    @discardableResult
    func signUp(email: String, password: String) async throws -> Bool {
        guard isConfigured() else {
            throw SupabaseServiceError.missingConfiguration
        }

        #if canImport(Supabase)
        guard let client else {
            throw SupabaseServiceError.missingConfiguration
        }

        let response = try await client.auth.signUp(email: email, password: password)
        return response.session != nil
        #else
        throw SupabaseServiceError.authenticationRequired
        #endif
    }

    func sendMagicLink(email: String, redirectTo: URL? = URL(string: "pacepilot://auth/callback")) async throws {
        guard isConfigured() else {
            throw SupabaseServiceError.missingConfiguration
        }

        #if canImport(Supabase)
        guard let client else {
            throw SupabaseServiceError.missingConfiguration
        }

        try await client.auth.signInWithOTP(email: email, redirectTo: redirectTo, shouldCreateUser: false)
        #else
        throw SupabaseServiceError.authenticationRequired
        #endif
    }

    func resetPassword(email: String, redirectTo: URL? = URL(string: "pacepilot://auth/callback")) async throws {
        guard isConfigured() else {
            throw SupabaseServiceError.missingConfiguration
        }

        #if canImport(Supabase)
        guard let client else {
            throw SupabaseServiceError.missingConfiguration
        }

        try await client.auth.resetPasswordForEmail(email, redirectTo: redirectTo)
        #else
        throw SupabaseServiceError.authenticationRequired
        #endif
    }

    @discardableResult
    func completeAuthCallback(from url: URL) async throws -> String? {
        guard isConfigured() else {
            throw SupabaseServiceError.missingConfiguration
        }

        #if canImport(Supabase)
        guard let client else {
            throw SupabaseServiceError.missingConfiguration
        }

        let session = try await client.auth.session(from: url)
        return session.user.email
        #else
        throw SupabaseServiceError.authenticationRequired
        #endif
    }

    func updatePassword(_ password: String) async throws {
        guard isConfigured() else {
            throw SupabaseServiceError.missingConfiguration
        }

        #if canImport(Supabase)
        guard let client else {
            throw SupabaseServiceError.missingConfiguration
        }

        try await client.auth.update(user: UserAttributes(password: password))
        #else
        throw SupabaseServiceError.authenticationRequired
        #endif
    }

    func signOut() async throws {
        guard isConfigured() else {
            return
        }

        #if canImport(Supabase)
        guard let client else {
            return
        }

        try await client.auth.signOut()
        #endif
    }
}

enum SupabaseServiceError: LocalizedError {
    case missingConfiguration
    case authenticationRequired

    var errorDescription: String? {
        switch self {
        case .missingConfiguration:
            "Configure Supabase before using online account features."
        case .authenticationRequired:
            "Sign in before using this online feature."
        }
    }
}
