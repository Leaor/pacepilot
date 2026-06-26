import SwiftUI

struct ForgotPasswordView: View {
    @State private var email = ""

    var body: some View {
        Form {
            Section("Forgot password") {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                Text("Password recovery is handled through Supabase Auth email templates.")
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
    }
}
