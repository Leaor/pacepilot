import SwiftUI

struct SupportView: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        List {
            Section("Training FAQ") {
                DisclosureGroup("Can PacePilot replace a coach?") {
                    Text("PacePilot provides training guidance and estimates. It does not provide medical advice or guarantees.")
                }
                DisclosureGroup("Why are easy runs easy?") {
                    Text("Most running stays easy so the hard work can be productive and recoverable.")
                }
            }
            Section("Support") {
                Button("Contact support") {
                    openMail(subject: "PacePilot support request")
                }
                Button("Report issue") {
                    openMail(subject: "PacePilot issue report")
                }
                NavigationLink("Data deletion request") { DeleteMyDataView() }
                NavigationLink("Export data") { ExportMyDataView() }
            }
            Section("Legal") {
                NavigationLink("Health Disclaimer") { LegalDocumentView(document: .health) }
                NavigationLink("Terms of Service") { LegalDocumentView(document: .terms) }
                NavigationLink("Privacy Policy") { LegalDocumentView(document: .privacy) }
                NavigationLink("Subscription Terms") { LegalDocumentView(document: .subscriptions) }
                NavigationLink("Data Deletion Policy") { LegalDocumentView(document: .deletion) }
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .ppTabSafeAreaPadding()
        .navigationTitle("Support")
    }

    private func openMail(subject: String) {
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = "support@pacepilot.app"
        components.queryItems = [URLQueryItem(name: "subject", value: subject)]

        if let url = components.url {
            openURL(url)
        }
    }
}
