import Foundation

enum ShoeStatus: String, Codable, CaseIterable {
    case active
    case retired
}

struct Shoe: Identifiable, Codable, Hashable {
    var id: UUID
    var brand: String
    var model: String
    var nickname: String
    var purchaseDate: Date
    var startingMileage: Double
    var currentMileage: Double
    var retirementMileageTarget: Double
    var notes: String
    var status: ShoeStatus

    var progress: Double {
        guard retirementMileageTarget > 0 else { return 0 }
        return min(currentMileage / retirementMileageTarget, 1)
    }

    var shouldWarnRetirement: Bool {
        progress >= 0.82 && status == .active
    }
}
