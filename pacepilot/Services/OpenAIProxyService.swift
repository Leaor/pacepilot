import Foundation

struct OpenAIProxyRequest: Codable {
    var threadID: UUID?
    var message: String
    var allowedSources: [String]
    var excludedSources: [String]
    var profileSummary: String
}

struct OpenAIProxyService {
    var supabase: SupabaseService
    var environment: AppEnvironment = .development

    func sendChat(_ request: OpenAIProxyRequest) async throws -> AIChatMessage {
        guard environment.aiFeatureEnabled, !environment.mockAI, supabase.isConfigured() else {
            return AIChatMessage(
                id: UUID(),
                role: .assistant,
                text: "I can help with that using your approved PacePilot data. Keep the next quality session controlled, protect the long run, and avoid making up missed volume all at once.",
                createdAt: .now,
                usedSources: request.allowedSources,
                excludedSources: request.excludedSources
            )
        }

        guard let url = URL(string: "\(supabase.configuration.url)/functions/v1/ai-chat") else {
            throw OpenAIProxyError.invalidURL
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue(supabase.configuration.anonKey, forHTTPHeaderField: "apikey")
        urlRequest.setValue("Bearer \(supabase.configuration.anonKey)", forHTTPHeaderField: "Authorization")
        urlRequest.httpBody = try JSONEncoder().encode(
            EdgeChatRequest(
                question: request.message,
                threadID: request.threadID,
                context: EdgeChatContext(
                    profileSummary: request.profileSummary,
                    dataCategoriesUsed: request.allowedSources,
                    excludedSources: request.excludedSources
                )
            )
        )

        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw OpenAIProxyError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            let error = (try? JSONDecoder().decode(EdgeErrorResponse.self, from: data).error) ?? "AI request failed with status \(httpResponse.statusCode)."
            throw OpenAIProxyError.edgeFunction(error)
        }

        let edgeResponse = try JSONDecoder().decode(EdgeChatResponse.self, from: data)
        return AIChatMessage(
            id: UUID(),
            role: .assistant,
            text: edgeResponse.displayText,
            createdAt: .now,
            usedSources: edgeResponse.dataCategoriesUsed ?? request.allowedSources,
            excludedSources: edgeResponse.excludedSources ?? request.excludedSources
        )
    }
}

private struct EdgeChatRequest: Encodable {
    var question: String
    var threadID: UUID?
    var context: EdgeChatContext
}

private struct EdgeChatContext: Encodable {
    var profileSummary: String
    var dataCategoriesUsed: [String]
    var excludedSources: [String]
}

private struct EdgeChatResponse: Decodable {
    var result: EdgeResult?
    var dataCategoriesUsed: [String]?
    var excludedSources: [String]?

    var displayText: String {
        result?.message
            ?? result?.answer
            ?? result?.summary
            ?? result?.content
            ?? "PacePilot Coach returned a response, but it did not include display text."
    }
}

private struct EdgeResult: Decodable {
    var message: String?
    var answer: String?
    var summary: String?
    var content: String?
}

private struct EdgeErrorResponse: Decodable {
    var error: String
}

enum OpenAIProxyError: LocalizedError {
    case invalidURL
    case invalidResponse
    case edgeFunction(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            "The configured Supabase URL is invalid."
        case .invalidResponse:
            "The AI Edge Function returned an unreadable response."
        case .edgeFunction(let message):
            message
        }
    }
}
