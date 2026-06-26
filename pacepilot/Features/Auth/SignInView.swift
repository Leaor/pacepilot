import SwiftUI

struct SignInView: View {
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
                    PPButton(title: "Sign In", systemImage: "arrow.right.circle.fill") {
                        appState.isAuthenticated = true
                        appState.isDemoMode = false
                        dismiss()
                    }
                    PPButton(title: "Magic Link", systemImage: "link", role: .secondary) {
                        auth.mode = .magicLink
                        auth.message = "Magic link flow is Supabase-ready."
                    }
                    PPButton(title: "Forgot Password", systemImage: "questionmark.circle", role: .quiet) {
                        auth.mode = .forgotPassword
                        auth.message = "Password reset email will be sent by Supabase Auth."
                    }
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
