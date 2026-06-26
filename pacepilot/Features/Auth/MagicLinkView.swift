import SwiftUI

struct MagicLinkView: View {
    @State private var email = ""

    var body: some View {
        Form {
            Section("Magic link") {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                Text("Supabase Auth sends the secure login email. No service-role key is stored in the app.")
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
    }
}
