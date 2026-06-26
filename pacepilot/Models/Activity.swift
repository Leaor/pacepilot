import CoreLocation
import Foundation

enum ActivitySource: String, Codable, CaseIterable, Identifiable {
    case pacepilotManual = "pacepilot_manual"
    case pacepilotGPS = "pacepilot_gps"
    case stravaCache = "strava_cache"
    case garminImport = "garmin_import"
    case appleHealthImport = "apple_health_import"
    case userProvidedImport = "user_provided_import"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .pacepilotManual: "PacePilot Manual"
        case .pacepilotGPS: "PacePilot GPS"
        case .stravaCache: "Strava Sync display only"
        case .garminImport: "Garmin optional"
        case .appleHealthImport: "Apple Health optional"
        case .userProvidedImport: "User Import"
        }
    }

    var canPowerCoaching: Bool {
        self != .stravaCache
    }
}

struct ActivitySplit: Identifiable, Codable, Hashable {
    var id = UUID()
    var kilometer: Int
    var paceSeconds: Int
}

struct ActivityRoutePoint: Identifiable, Codable, Hashable {
    var id = UUID()
    var latitude: Double
    var longitude: Double
    var recordedAt: Date

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    init(id: UUID = UUID(), latitude: Double, longitude: Double, recordedAt: Date) {
        self.id = id
        self.latitude = latitude
        self.longitude = longitude
        self.recordedAt = recordedAt
    }

    init(coordinate: CLLocationCoordinate2D, recordedAt: Date) {
        self.init(latitude: coordinate.latitude, longitude: coordinate.longitude, recordedAt: recordedAt)
    }
}

struct Activity: Identifiable, Codable, Hashable {
    var id: UUID
    var workoutID: UUID?
    var source: ActivitySource
    var startedAt: Date
    var distanceKilometers: Double
    var durationSeconds: Int
    var elevationMeters: Double
    var averageHeartRate: Int?
    var perceivedEffort: Int
    var fatigueAfter: Int
    var notes: String
    var shoeID: UUID?
    var splits: [ActivitySplit]
    var route: [ActivityRoutePoint]

    var averagePaceSecondsPerKilometer: Int {
        guard distanceKilometers > 0 else { return 0 }
        return Int(Double(durationSeconds) / distanceKilometers)
    }

    init(
        id: UUID,
        workoutID: UUID? = nil,
        source: ActivitySource,
        startedAt: Date,
        distanceKilometers: Double,
        durationSeconds: Int,
        elevationMeters: Double,
        averageHeartRate: Int?,
        perceivedEffort: Int,
        fatigueAfter: Int,
        notes: String,
        shoeID: UUID?,
        splits: [ActivitySplit],
        route: [ActivityRoutePoint] = []
    ) {
        self.id = id
        self.workoutID = workoutID
        self.source = source
        self.startedAt = startedAt
        self.distanceKilometers = distanceKilometers
        self.durationSeconds = durationSeconds
        self.elevationMeters = elevationMeters
        self.averageHeartRate = averageHeartRate
        self.perceivedEffort = perceivedEffort
        self.fatigueAfter = fatigueAfter
        self.notes = notes
        self.shoeID = shoeID
        self.splits = splits
        self.route = route
    }
}
