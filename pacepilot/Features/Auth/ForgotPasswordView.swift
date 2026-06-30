import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.appEnvironment) private var environment
    @StateObject private var auth = AuthService()

    var body: some View {
        Form {
            Section("Forgot password") {
                TextField("Email", text: $auth.email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                Text("Enter your account email and PacePilot will send a secure reset link.")
                    .foregroundStyle(PPColors.textMuted)
                PPButton(title: auth.isLoading ? "Sending..." : "Send Reset Link", systemImage: "questionmark.circle") {
                    Task {
                        await auth.resetPassword(environment: environment)
                    }
                }
                .disabled(auth.isLoading)
                if let message = auth.message {
                    Text(message)
                        .foregroundStyle(PPColors.textMuted)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
    }
}
