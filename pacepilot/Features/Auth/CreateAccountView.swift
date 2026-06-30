import SwiftUI

struct CreateAccountView: View {
    @Environment(\.appEnvironment) private var environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var auth = AuthService()

    var body: some View {
        NavigationStack {
            Form {
                Section("Create account") {
                    TextField("Email", text: $auth.email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    SecureField("Password", text: $auth.password)
                }
                Section {
                    Text("PacePilot stores onboarding answers in profile tables protected by Row Level Security after account setup.")
                        .foregroundStyle(PPColors.textMuted)
                    PPButton(title: auth.isLoading ? "Creating..." : "Create Account", systemImage: "person.badge.plus") {
                        Task {
                            if await auth.createAccount(environment: environment, appState: appState) {
                                dismiss()
                            }
                        }
                    }
                    .disabled(auth.isLoading)
                    NavigationLink("Preview Plan Setup Without Account") {
                        OnboardingView()
                    }
                }
                if let message = auth.message {
                    Text(message)
                        .foregroundStyle(PPColors.textMuted)
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .navigationTitle("Create Account")
            .toolbar { Button("Done") { dismiss() } }
        }
    }
}
