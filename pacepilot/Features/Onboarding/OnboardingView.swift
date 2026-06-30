import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var profile = RunnerProfile.demo

    var body: some View {
        Form {
            Section("Runner") {
                TextField("Name", text: $profile.name)
                TextField("Age range", text: $profile.ageRange)
                TextField("Timezone", text: $profile.timezone)
                Picker("Units", selection: $profile.units) {
                    ForEach(Units.allCases) { Text($0.label).tag($0) }
                }
                Picker("Experience", selection: $profile.experience) {
                    ForEach(ExperienceLevel.allCases) { Text($0.title).tag($0) }
                }
            }

            Section("Training") {
                Stepper("Weekly distance: \(Int(profile.currentWeeklyMileage)) \(profile.units.label)", value: $profile.currentWeeklyMileage, in: 0...160, step: 1)
                Stepper("Longest recent run: \(Int(profile.longestRecentRun)) \(profile.units.label)", value: $profile.longestRecentRun, in: 0...80, step: 1)
                Picker("Goal", selection: $profile.goal) {
                    ForEach(TrainingGoal.allCases) { Text($0.title).tag($0) }
                }
                DatePicker("Race date", selection: $profile.raceDate, displayedComponents: .date)
                Toggle("Injury caution", isOn: $profile.injuryCaution)
            }

            Section("Schedule") {
                Picker("Long-run day", selection: $profile.preferredLongRunDay) {
                    ForEach(Weekday.allCases) { Text($0.shortTitle).tag($0) }
                }
                Picker("Strength", selection: $profile.strengthPreference) {
                    ForEach(StrengthPreference.allCases) { Text($0.title).tag($0) }
                }
                Picker("Equipment", selection: $profile.equipment) {
                    ForEach(EquipmentPreference.allCases) { Text($0.title).tag($0) }
                }
                Picker("Coaching tone", selection: $profile.coachingTone) {
                    ForEach(CoachingTone.allCases) { Text($0.title).tag($0) }
                }
            }

            Section("Recent race times") {
                Text("5K, 10K, half marathon, and marathon race results are saved as approved PacePilot data sources when entered here.")
                    .foregroundStyle(PPColors.textMuted)
            }

            Section {
                PPButton(title: "Generate Plan", systemImage: "sparkles") {
                    appState.profile = profile
                    appState.trainingPlan = TrainingPlanService().generateDemoPlan(for: profile)
                    appState.isAuthenticated = false
                    appState.isDemoMode = true
                    dismiss()
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .navigationTitle("Onboarding")
    }
}
