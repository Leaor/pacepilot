import Foundation

enum PlanGenerator {
    static func generate(from input: PlanInput, startDate: Date = .now) -> TrainingPlan {
        let calendar = Calendar.current
        let daysToRace = max(calendar.dateComponents([.day], from: startDate, to: input.raceDate).day ?? 42, 42)
        let weekCount = min(max(daysToRace / 7, 6), 26)
        let paceZones = PaceEngine.zones(
            from: input.recentRaceResult,
            goalDistanceKilometers: input.goal.raceDistanceKilometers,
            goalTimeSeconds: input.goalTimeSeconds
        )

        var weeks: [TrainingWeek] = []
        let safeMileageIncrease = input.injuryCaution ? 1.04 : 1.08
        var targetMileage = max(input.currentWeeklyMileage, input.goal.raceDistanceKilometers * 1.7)

        for weekNumber in 1...weekCount {
            let phase = phase(for: weekNumber, totalWeeks: weekCount, injuryCaution: input.injuryCaution)
            if [.recovery, .deload].contains(phase) {
                targetMileage *= 0.82
            } else if phase == .taper {
                targetMileage *= weekNumber == weekCount ? 0.48 : 0.68
            } else if phase != .race {
                targetMileage *= safeMileageIncrease
            }

            let start = calendar.date(byAdding: .day, value: (weekNumber - 1) * 7, to: calendar.startOfDay(for: startDate)) ?? startDate
            let end = calendar.date(byAdding: .day, value: 6, to: start) ?? start
            let workouts = buildWorkouts(
                weekNumber: weekNumber,
                weekStart: start,
                phase: phase,
                input: input,
                targetMileage: targetMileage,
                paceZones: paceZones,
                totalWeeks: weekCount
            )

            weeks.append(
                TrainingWeek(
                    id: UUID(),
                    number: weekNumber,
                    startDate: start,
                    endDate: end,
                    phase: phase,
                    targetDistanceKilometers: round(targetMileage * 10) / 10,
                    workouts: workouts,
                    focus: focus(for: phase)
                )
            )
        }

        return TrainingPlan(
            id: UUID(),
            name: "\(input.goal.title) Plan",
            goal: input.goal,
            raceDate: input.raceDate,
            createdAt: startDate,
            weeks: weeks,
            paceZones: paceZones,
            aRace: nil,
            bRace: nil
        )
    }

    private static func phase(for week: Int, totalWeeks: Int, injuryCaution: Bool) -> WeekPhase {
        if week == totalWeeks { return .race }
        if week >= totalWeeks - 2 { return .taper }
        if injuryCaution && week % 3 == 0 { return .deload }
        if week % 4 == 0 { return .recovery }
        return week < max(4, totalWeeks / 3) ? .base : .build
    }

    private static func focus(for phase: WeekPhase) -> String {
        switch phase {
        case .base: "Aerobic rhythm and gentle consistency"
        case .build: "Controlled quality with mostly easy volume"
        case .recovery: "Absorb the work and freshen up"
        case .deload: "Reduce load and protect the legs"
        case .taper: "Sharpen while reducing fatigue"
        case .race: "Arrive healthy and execute calmly"
        }
    }

    private static func buildWorkouts(
        weekNumber: Int,
        weekStart: Date,
        phase: WeekPhase,
        input: PlanInput,
        targetMileage: Double,
        paceZones: PaceZones,
        totalWeeks: Int
    ) -> [Workout] {
        let calendar = Calendar.current
        let runDays = input.availableRunDays.prefix(max(2, min(input.trainingDaysPerWeek, input.availableRunDays.count)))
        let hardWorkoutAllowed = input.experienceLevel != .new && !input.injuryCaution && phase != .recovery && phase != .deload
        let longRunDistance = min(targetMileage * 0.34, input.goal.raceDistanceKilometers * 1.35)
        var workouts: [Workout] = []

        for (index, weekday) in runDays.enumerated() {
            let date = date(in: weekStart, matching: weekday, calendar: calendar)
            let type: WorkoutType
            if phase == .race && weekday == input.preferredLongRunDay {
                type = .race
            } else if weekday == input.preferredLongRunDay {
                type = .longRun
            } else if hardWorkoutAllowed && index == 1 {
                type = weekNumber.isMultiple(of: 2) ? .tempoRun : .intervals
            } else {
                type = phase == .recovery || phase == .deload ? .recoveryRun : .easyRun
            }

            let distance = distance(for: type, targetMileage: targetMileage, longRunDistance: longRunDistance, phase: phase)
            workouts.append(
                Workout(
                    id: UUID(),
                    scheduledDate: date,
                    title: type.title,
                    type: type,
                    status: .planned,
                    distanceKilometers: distance,
                    durationMinutes: nil,
                    targetPace: pace(for: type, zones: paceZones),
                    purpose: purpose(for: type, phase: phase),
                    notes: type == .race ? "Estimate only. No result is guaranteed." : "Keep effort controlled and never treat training guidance as medical advice.",
                    steps: steps(for: type, distance: distance)
                )
            )
        }

        if input.strengthPreference != .none {
            let strengthDate = calendar.date(byAdding: .day, value: 2, to: weekStart) ?? weekStart
            workouts.append(
                Workout(
                    id: UUID(),
                    scheduledDate: strengthDate,
                    title: "Strength and Mobility",
                    type: .strength,
                    status: .planned,
                    distanceKilometers: nil,
                    durationMinutes: input.strengthPreference == .twoDays ? 35 : 25,
                    targetPace: nil,
                    purpose: "Durability work for hips, calves, feet, and trunk.",
                    notes: "Stop if pain changes your form. This is general fitness guidance, not medical advice.",
                    steps: [
                        WorkoutStep(title: "Warm up", detail: "5 minutes easy mobility", durationMinutes: 5),
                        WorkoutStep(title: "Strength circuit", detail: "Squat, hinge, calf raise, side plank", durationMinutes: 20),
                        WorkoutStep(title: "Cooldown", detail: "Gentle mobility and breathing", durationMinutes: 5)
                    ]
                )
            )
        }

        return workouts.sorted { $0.scheduledDate < $1.scheduledDate }
    }

    private static func date(in weekStart: Date, matching weekday: Weekday, calendar: Calendar) -> Date {
        let startWeekday = calendar.component(.weekday, from: weekStart)
        let offset = (weekday.rawValue - startWeekday + 7) % 7
        return calendar.date(byAdding: .day, value: offset, to: weekStart) ?? weekStart
    }

    private static func distance(for type: WorkoutType, targetMileage: Double, longRunDistance: Double, phase: WeekPhase) -> Double? {
        switch type {
        case .longRun: round(longRunDistance * 10) / 10
        case .tempoRun, .intervals, .hills, .racePace: round(targetMileage * 0.18 * 10) / 10
        case .race: nil
        case .strength, .mobility, .rest: nil
        default: round(targetMileage * 0.16 * (phase == .taper ? 0.72 : 1) * 10) / 10
        }
    }

    private static func pace(for type: WorkoutType, zones: PaceZones) -> PaceRange? {
        switch type {
        case .easyRun, .strides: zones.easy
        case .recoveryRun: zones.recovery
        case .longRun: zones.longRun
        case .tempoRun: zones.tempo
        case .intervals, .hills: zones.interval
        case .racePace, .race, .tuneUpRace: zones.race
        case .strength, .mobility, .rest: nil
        }
    }

    private static func purpose(for type: WorkoutType, phase: WeekPhase) -> String {
        switch type {
        case .easyRun: "Build aerobic capacity without adding unnecessary strain."
        case .recoveryRun: "Move gently and finish fresher than you started."
        case .longRun: "Extend endurance while staying conversational."
        case .tempoRun: "Practice steady discomfort without racing the workout."
        case .intervals: "Improve speed economy with full control."
        case .hills: "Build strength and form under load."
        case .racePace: "Rehearse goal rhythm."
        case .strides: "Add relaxed quickness."
        case .tuneUpRace: "Practice routine and pacing before the A-race."
        case .strength: "Support running durability."
        case .mobility: "Restore range and reduce stiffness."
        case .rest: "Recover and adapt."
        case .race: phase == .race ? "Execute the A-race plan." : "Practice racing without overreaching."
        }
    }

    private static func steps(for type: WorkoutType, distance: Double?) -> [WorkoutStep] {
        switch type {
        case .tempoRun:
            return [
                WorkoutStep(title: "Warm up", detail: "Easy running plus 4 strides", durationMinutes: 12),
                WorkoutStep(title: "Tempo block", detail: "Controlled steady effort", distanceKilometers: max((distance ?? 7) - 3, 2)),
                WorkoutStep(title: "Cool down", detail: "Relaxed easy running", durationMinutes: 10)
            ]
        case .intervals:
            return [
                WorkoutStep(title: "Warm up", detail: "Easy running and drills", durationMinutes: 15),
                WorkoutStep(title: "Repeats", detail: "Short controlled intervals with recovery jogs"),
                WorkoutStep(title: "Cool down", detail: "Easy running", durationMinutes: 10)
            ]
        default:
            return [WorkoutStep(title: type.title, detail: "Keep the effort aligned with the target purpose.", distanceKilometers: distance)]
        }
    }
}
