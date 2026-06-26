import Foundation

enum AISafetyGuards {
    static func sanitized(_ text: String) -> String {
        let forbidden = ["diagnose", "ignore pain", "run through chest pain"]
        if forbidden.contains(where: { text.lowercased().contains($0) }) {
            return "I cannot provide medical advice. Consider resting and speaking with a qualified clinician if symptoms are concerning."
        }
        return text
    }
}
