import SwiftUI

struct MagicLinkView: View {
    @Environment(\.appEnvironment) private var environment
    @StateObject private var auth = AuthService()

    var body: some View {
        Form {
            Section("Magic link") {
                TextField("Email", text: $auth.email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                Text("No service-role key is stored in the app. Sign-in links are sent by Supabase Auth.")
                    .foregroundStyle(PPColors.textMuted)
                PPButton(title: auth.isLoading ? "Sending..." : "Send Magic Link", systemImage: "link") {
                    Task {
                        await auth.sendMagicLink(environment: environment)
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
