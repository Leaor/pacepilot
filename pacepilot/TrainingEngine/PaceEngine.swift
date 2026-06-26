import Foundation

struct PaceZones: Codable, Hashable {
    var easy: PaceRange
    var recovery: PaceRange
    var tempo: PaceRange
    var interval: PaceRange
    var longRun: PaceRange
    var race: PaceRange
}

enum PaceEngine {
    static func zones(from raceResult: RecentRaceResult?, goalDistanceKilometers: Double, goalTimeSeconds: TimeInterval?) -> PaceZones {
        let trustedRaceResult = raceResult?.source.canPowerCoaching == true ? raceResult : nil
        let baseRacePace: Int
        if let trustedRaceResult {
            let equivalentSeconds = trustedRaceResult.timeSeconds * pow(goalDistanceKilometers / trustedRaceResult.distanceKilometers, 1.06)
            baseRacePace = Int(equivalentSeconds / goalDistanceKilometers)
        } else if let goalTimeSeconds {
            baseRacePace = Int(goalTimeSeconds / goalDistanceKilometers)
        } else {
            baseRacePace = 300
        }

        return PaceZones(
            easy: PaceRange(lowerSecondsPerKilometer: baseRacePace + 55, upperSecondsPerKilometer: baseRacePace + 95),
            recovery: PaceRange(lowerSecondsPerKilometer: baseRacePace + 85, upperSecondsPerKilometer: baseRacePace + 130),
            tempo: PaceRange(lowerSecondsPerKilometer: max(baseRacePace + 10, 1), upperSecondsPerKilometer: baseRacePace + 28),
            interval: PaceRange(lowerSecondsPerKilometer: max(baseRacePace - 22, 1), upperSecondsPerKilometer: max(baseRacePace - 8, 1)),
            longRun: PaceRange(lowerSecondsPerKilometer: baseRacePace + 65, upperSecondsPerKilometer: baseRacePace + 115),
            race: PaceRange(lowerSecondsPerKilometer: baseRacePace, upperSecondsPerKilometer: baseRacePace + 4)
        )
    }
}
