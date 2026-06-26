import Foundation

#if canImport(Supabase)
import Supabase
#endif

struct SupabaseConfiguration: Hashable {
    var url: String
    var anonKey: String
}

enum SupabaseTable: String {
    case profiles
    case subscriptions
    case trainingPlans = "training_plans"
    case workouts
    case activities
    case checkins
    case shoes
    case raceStrategies = "race_strategies"
    case aiChatThreads = "ai_chat_threads"
    case privacyPreferences = "user_privacy_preferences"
}

final class SupabaseService {
    let configuration: SupabaseConfiguration

    #if canImport(Supabase)
    let client: SupabaseClient?
    #endif

    init(configuration: SupabaseConfiguration) {
        self.configuration = configuration
        #if canImport(Supabase)
        if let url = URL(string: configuration.url), !configuration.anonKey.isEmpty {
            self.client = SupabaseClient(supabaseURL: url, supabaseKey: configuration.anonKey)
        } else {
            self.client = nil
        }
        #endif
    }

    func isConfigured() -> Bool {
        #if canImport(Supabase)
        client != nil
        #else
        URL(string: configuration.url) != nil && !configuration.anonKey.isEmpty
        #endif
    }
}
