import SwiftUI

struct SignInView: View {
    @Environment(\.appEnvironment) private var environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var auth = AuthService()

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    TextField("Email", text: $auth.email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                    SecureField("Password", text: $auth.password)
                }
                Section {
                    PPButton(title: auth.isLoading ? "Signing In..." : "Sign In", systemImage: "arrow.right.circle.fill") {
                        Task {
                            if await auth.signIn(environment: environment, appState: appState) {
                                dismiss()
                            }
                        }
                    }
                    .disabled(auth.isLoading)
                    PPButton(title: "Magic Link", systemImage: "link", role: .secondary) {
                        Task {
                            await auth.sendMagicLink(environment: environment)
                        }
                    }
                    .disabled(auth.isLoading)
                    PPButton(title: "Forgot Password", systemImage: "questionmark.circle", role: .quiet) {
                        Task {
                            await auth.resetPassword(environment: environment)
                        }
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
            .navigationTitle("Sign In")
            .toolbar { Button("Done") { dismiss() } }
        }
    }
}
