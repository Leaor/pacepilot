import Foundation

struct GarminService {
    var featureEnabled: Bool
    var mockMode: Bool

    func status() -> ConnectedServiceStatus {
        ConnectedServiceStatus(
            isConnected: mockMode,
            lastSync: mockMode ? .now : nil,
            message: featureEnabled ? "Garmin import can be enabled with consent." : "Garmin is behind a feature flag."
        )
    }
}
