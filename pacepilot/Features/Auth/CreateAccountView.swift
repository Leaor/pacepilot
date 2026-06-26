import SwiftUI

struct CreateAccountView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Create account") {
                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    SecureField("Password", text: $password)
                }
                Section {
                    Text("After signup, PacePilot stores onboarding answers in Supabase profile tables protected by Row Level Security.")
                        .foregroundStyle(PPColors.textMuted)
                    NavigationLink("Continue to Onboarding") {
                        OnboardingView()
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .navigationTitle("Create Account")
            .toolbar { Button("Done") { dismiss() } }
        }
    }
}
