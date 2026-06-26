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

    func signInDemo(appState: AppState) {
        appState.activateDemoMode()
        message = "Demo mode started."
    }
}
