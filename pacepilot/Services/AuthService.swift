import Foundation
import Combine

enum AuthMode: Hashable {
    case welcome
    case signIn
    case createAccount
    case magicLink
    case forgotPassword
    case demo
}

@MainActor
final class AuthService: ObservableObject {
    @Published var mode: AuthMode = .welcome
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var message: String?

    func signIn(environment: AppEnvironment, appState: AppState) async -> Bool {
        guard !isLoading else { return false }
        let normalizedEmail = normalizedEmail
        guard validateEmail(normalizedEmail), validatePassword(password) else {
            return false
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let signedInEmail = try await supabaseService(environment: environment).signIn(email: normalizedEmail, password: password)
            appState.activateAuthenticatedAccount(email: signedInEmail)
            message = "Signed in."
            return true
        } catch {
            message = safeFailureMessage(for: error, fallback: "Could not sign in. Check your email and password.")
            return false
        }
    }

    func createAccount(environment: AppEnvironment, appState: AppState) async -> Bool {
        guard !isLoading else { return false }
        let normalizedEmail = normalizedEmail
        guard validateEmail(normalizedEmail), validateNewPassword(password) else {
            return false
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let hasSession = try await supabaseService(environment: environment).signUp(email: normalizedEmail, password: password)
            if hasSession {
                appState.activateAuthenticatedAccount(email: normalizedEmail)
                message = "Account created."
                return true
            }

            message = "Check your email to confirm your account before signing in."
            return false
        } catch {
            message = safeFailureMessage(for: error, fallback: "Could not create the account. Try again later.")
            return false
        }
    }

    func sendMagicLink(environment: AppEnvironment) async {
        guard !isLoading else { return }
        let normalizedEmail = normalizedEmail
        guard validateEmail(normalizedEmail) else {
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            try await supabaseService(environment: environment).sendMagicLink(email: normalizedEmail)
            message = "If an account exists for that email, a sign-in link is on the way."
        } catch {
            message = safeFailureMessage(for: error, fallback: "Could not send a magic link. Try again later.")
        }
    }

    func resetPassword(environment: AppEnvironment) async {
        guard !isLoading else { return }
        let normalizedEmail = normalizedEmail
        guard validateEmail(normalizedEmail) else {
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            try await supabaseService(environment: environment).resetPassword(email: normalizedEmail)
            message = "If an account exists for that email, a reset link is on the way."
        } catch {
            message = safeFailureMessage(for: error, fallback: "Could not send a reset link. Try again later.")
        }
    }

    func completeAuthCallback(_ url: URL, environment: AppEnvironment, appState: AppState) async {
        guard !isLoading else { return }

        isLoading = true
        defer { isLoading = false }

        do {
            let email = try await supabaseService(environment: environment).completeAuthCallback(from: url)
            appState.activateAuthenticatedAccount(email: email)
            appState.pendingPasswordUpdate = callbackType(from: url) == "recovery"
            message = "Signed in."
        } catch {
            message = safeFailureMessage(for: error, fallback: "Could not complete the secure sign-in link. Request a new link and try again.")
        }
    }

    func updatePassword(environment: AppEnvironment, appState: AppState) async -> Bool {
        guard !isLoading else { return false }
        guard validateNewPassword(password) else {
            return false
        }

        isLoading = true
        defer { isLoading = false }

        do {
            try await supabaseService(environment: environment).updatePassword(password)
            appState.pendingPasswordUpdate = false
            message = "Password updated."
            return true
        } catch {
            message = safeFailureMessage(for: error, fallback: "Could not update the password. Request a new reset link and try again.")
            return false
        }
    }

    func signInDemo(appState: AppState) {
        appState.activateDemoMode()
        message = "Sample plan loaded."
    }

    private var normalizedEmail: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private func validateEmail(_ value: String) -> Bool {
        guard value.contains("@"), value.contains(".") else {
            message = "Enter a valid email address."
            return false
        }

        return true
    }

    private func validatePassword(_ value: String) -> Bool {
        guard !value.isEmpty else {
            message = "Enter your password."
            return false
        }

        return true
    }

    private func validateNewPassword(_ value: String) -> Bool {
        guard !value.isEmpty else {
            message = "Create a password."
            return false
        }

        guard value.count >= 8 else {
            message = "Use at least 8 characters for your password."
            return false
        }

        return true
    }

    private func supabaseService(environment: AppEnvironment) -> SupabaseService {
        SupabaseService(
            configuration: SupabaseConfiguration(
                url: environment.supabaseURL,
                anonKey: environment.supabaseAnonKey
            )
        )
    }

    private func callbackType(from url: URL) -> String? {
        var items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []

        if let fragment = url.fragment,
           let fragmentComponents = URLComponents(string: "pacepilot://auth/callback?\(fragment)") {
            items.append(contentsOf: fragmentComponents.queryItems ?? [])
        }

        return items.first { $0.name == "type" }?.value
    }

    private func safeFailureMessage(for error: Error, fallback: String) -> String {
        if let serviceError = error as? SupabaseServiceError {
            return serviceError.localizedDescription
        }

        return fallback
    }
}
