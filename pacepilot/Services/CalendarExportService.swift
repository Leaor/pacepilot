import Foundation

struct CalendarExportService {
    func ics(for plan: TrainingPlan, timezone: String = "America/Toronto") -> String {
        var lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//PacePilot//Training Plan//EN",
            "CALSCALE:GREGORIAN",
            "X-WR-TIMEZONE:\(timezone)"
        ]

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd"
        formatter.timeZone = TimeZone(identifier: timezone)

        for workout in plan.weeks.flatMap(\.workouts) {
            lines.append(contentsOf: [
                "BEGIN:VEVENT",
                "UID:\(workout.id.uuidString)@pacepilot",
                "DTSTAMP:\(formatter.string(from: .now))T120000Z",
                "DTSTART;VALUE=DATE:\(formatter.string(from: workout.scheduledDate))",
                "SUMMARY:PacePilot: \(workout.title)",
                "CATEGORIES:\(category(for: workout.type))",
                "DESCRIPTION:\(description(for: workout))",
                "END:VEVENT"
            ])
        }

        lines.append("END:VCALENDAR")
        return lines.joined(separator: "\r\n")
    }

    private func category(for type: WorkoutType) -> String {
        switch type {
        case .easyRun: "Easy Runs"
        case .intervals, .hills, .strides: "Speed / Hills"
        case .tempoRun, .racePace: "Tempo / Race Pace"
        case .longRun: "Long Runs"
        case .strength, .mobility: "Strength / Mobility"
        case .rest, .recoveryRun: "Rest / Recovery"
        case .race, .tuneUpRace: "Race Days"
        }
    }

    private func description(for workout: Workout) -> String {
        let distance = workout.distanceKilometers.map { "\($0) km" } ?? ""
        let pace = workout.targetPace?.formatted ?? ""
        return [workout.purpose, distance, pace, workout.notes]
            .filter { !$0.isEmpty }
            .joined(separator: " | ")
    }
}
