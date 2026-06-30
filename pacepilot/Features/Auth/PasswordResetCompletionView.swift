import SwiftUI

struct PasswordResetCompletionView: View {
    @Environment(\.appEnvironment) private var environment
    @EnvironmentObject private var appState: AppState
    @StateObject private var auth = AuthService()
    @State private var confirmPassword = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Set new password") {
                    SecureField("New password", text: $auth.password)
                        .textContentType(.newPassword)
                    SecureField("Confirm password", text: $confirmPassword)
                        .textContentType(.newPassword)
                    Text("Your reset link has been verified. Choose a new password to finish securing the account.")
                        .foregroundStyle(PPColors.textMuted)
                }

                Section {
                    PPButton(title: auth.isLoading ? "Updating..." : "Update Password", systemImage: "key.fill") {
                        Task {
                            guard auth.password == confirmPassword else {
                                auth.message = "Passwords must match."
                                return
                            }

                            _ = await auth.updatePassword(environment: environment, appState: appState)
                        }
                    }
                    .disabled(auth.isLoading)

                    PPButton(title: "Later", systemImage: "clock", role: .quiet) {
                        appState.pendingPasswordUpdate = false
                    }
                    .disabled(auth.isLoading)
                }

                if let message = auth.message {
                    Text(message)
                        .foregroundStyle(PPColors.textMuted)
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .navigationTitle("Reset Password")
            .interactiveDismissDisabled(auth.isLoading)
        }
    }
}

#Preview {
    PasswordResetCompletionView()
        .environmentObject(AppState())
        .environment(\.appEnvironment, .development)
}
