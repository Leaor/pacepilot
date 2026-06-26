import Foundation

struct AIDataPolicyResult: Hashable {
    var allowedSources: [ActivitySource]
    var excludedSources: [ActivitySource]
    var auditSummary: String
}

enum AIDataPolicy {
    static func filter(activitySources: [ActivitySource], privacy: PrivacyPreferences) -> AIDataPolicyResult {
        var allowed: [ActivitySource] = []
        var excluded: [ActivitySource] = []

        for source in activitySources {
            if source == .stravaCache {
                excluded.append(source)
                continue
            }
            if source == .garminImport && !privacy.aiCanUseGarminData {
                excluded.append(source)
                continue
            }
            if source == .appleHealthImport && !privacy.aiCanUseAppleHealthData {
                excluded.append(source)
                continue
            }
            if source == .userProvidedImport && !privacy.aiCanUseUserProvidedImports {
                excluded.append(source)
                continue
            }
            if [.pacepilotGPS, .pacepilotManual].contains(source) && !privacy.aiCanUsePacePilotActivityHistory {
                excluded.append(source)
                continue
            }
            allowed.append(source)
        }

        return AIDataPolicyResult(
            allowedSources: allowed,
            excludedSources: excluded,
            auditSummary: "AI data firewall applied. Always excluded source=strava_cache and respected privacy preferences."
        )
    }
}
