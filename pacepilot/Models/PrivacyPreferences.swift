import Foundation

struct PrivacyPreferences: Identifiable, Codable, Hashable {
    var id: UUID
    var aiCoachEnabled: Bool
    var aiCanUsePacePilotActivityHistory: Bool
    var aiCanUseCheckIns: Bool
    var aiCanUseRaceGoals: Bool
    var aiCanUseChatHistory: Bool
    var aiCanUseUserProvidedImports: Bool
    var aiCanUseGarminData: Bool
    var aiCanUseAppleHealthData: Bool
    var profilePrivate: Bool
    var activityPrivate: Bool

    static let demo = PrivacyPreferences(
        id: UUID(uuidString: "22222222-2222-2222-2222-222222222222")!,
        aiCoachEnabled: true,
        aiCanUsePacePilotActivityHistory: true,
        aiCanUseCheckIns: true,
        aiCanUseRaceGoals: true,
        aiCanUseChatHistory: false,
        aiCanUseUserProvidedImports: true,
        aiCanUseGarminData: false,
        aiCanUseAppleHealthData: false,
        profilePrivate: true,
        activityPrivate: true
    )
}
