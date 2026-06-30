import SwiftUI

struct GearView: View {
    @EnvironmentObject private var appState: AppState
    @State private var showingAddShoe = false

    var body: some View {
        List {
            Section {
                Button {
                    showingAddShoe = true
                } label: {
                    Label("Add Shoe", systemImage: "plus.circle.fill")
                }
            }
            ForEach(appState.shoes) { shoe in
                NavigationLink {
                    ShoeDetailView(shoe: shoe)
                } label: {
                    VStack(alignment: .leading, spacing: PPSpacing.sm) {
                        HStack {
                            Text(shoe.nickname)
                                .font(PPTypography.headline)
                            Spacer()
                            if shoe.shouldWarnRetirement {
                                PPBadge(title: "Retirement soon", color: PPColors.warning)
                            }
                        }
                        Text("\(shoe.brand) \(shoe.model)")
                            .foregroundStyle(PPColors.textMuted)
                        ProgressView(value: shoe.progress)
                            .tint(shoe.shouldWarnRetirement ? PPColors.warning : PPColors.orange)
                        Text(String(format: "%.0f / %.0f km", shoe.currentMileage, shoe.retirementMileageTarget))
                            .font(PPTypography.caption)
                            .foregroundStyle(PPColors.textMuted)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .navigationTitle("Shoes")
        .sheet(isPresented: $showingAddShoe) { AddShoeView() }
    }
}

struct ShoeDetailView: View {
    @EnvironmentObject private var appState: AppState
    let shoe: Shoe
    @State private var actionResult: GearActionResult?

    private var currentShoe: Shoe {
        appState.shoes.first { $0.id == shoe.id } ?? shoe
    }

    var body: some View {
        List {
            Section("Shoe") {
                Label(currentShoe.brand, systemImage: "tag")
                Label(currentShoe.model, systemImage: "shoeprints.fill")
                Label(currentShoe.nickname, systemImage: "quote.bubble")
                Label(currentShoe.purchaseDate.formatted(date: .abbreviated, time: .omitted), systemImage: "calendar")
            }
            Section("Mileage") {
                ProgressView(value: currentShoe.progress)
                    .tint(PPColors.orange)
                Text(String(format: "%.0f km current", currentShoe.currentMileage))
                Text(String(format: "%.0f km retirement target", currentShoe.retirementMileageTarget))
            }
            Section("History") {
                Text("Assigned activity history appears here after production sync.")
                if currentShoe.status == .active {
                    Button("Mark retired", role: .destructive) {
                        markRetired()
                    }
                } else {
                    Label("Retired", systemImage: "checkmark.circle.fill")
                }
            }
            Section("Notes") {
                Text(currentShoe.notes)
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .navigationTitle(currentShoe.nickname)
        .alert(actionResult?.title ?? "Shoe", isPresented: Binding(get: { actionResult != nil }, set: { if !$0 { actionResult = nil } })) {
            Button("OK") { actionResult = nil }
        } message: {
            Text(actionResult?.message ?? "")
        }
    }

    private func markRetired() {
        guard let index = appState.shoes.firstIndex(where: { $0.id == shoe.id }) else {
            actionResult = GearActionResult(title: "Shoe unavailable", message: "PacePilot could not find this shoe in your gear list.")
            return
        }

        appState.shoes[index].status = .retired
        actionResult = GearActionResult(title: "Shoe retired", message: "\(currentShoe.nickname) has been marked retired.")
    }
}

private struct GearActionResult: Identifiable, Hashable {
    let id = UUID()
    var title: String
    var message: String
}

struct AddShoeView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @State private var brand = ""
    @State private var model = ""
    @State private var nickname = ""
    @State private var purchaseDate = Date()
    @State private var startingMileage = 0.0
    @State private var retirementTarget = 650.0
    @State private var notes = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Shoe") {
                    TextField("Brand", text: $brand)
                    TextField("Model", text: $model)
                    TextField("Nickname", text: $nickname)
                    DatePicker("Purchase date", selection: $purchaseDate, displayedComponents: .date)
                }
                Section("Mileage") {
                    Stepper(String(format: "Starting: %.0f km", startingMileage), value: $startingMileage, in: 0...2000)
                    Stepper(String(format: "Retire at: %.0f km", retirementTarget), value: $retirementTarget, in: 100...1200)
                }
                Section("Notes") {
                    TextField("Notes", text: $notes, axis: .vertical)
                }
                Section {
                    PPButton(title: "Save Shoe", systemImage: "checkmark.circle.fill") {
                        appState.shoes.append(
                            Shoe(id: UUID(), brand: brand, model: model, nickname: nickname, purchaseDate: purchaseDate, startingMileage: startingMileage, currentMileage: startingMileage, retirementMileageTarget: retirementTarget, notes: notes, status: .active)
                        )
                        dismiss()
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .navigationTitle("Add Shoe")
            .toolbar { Button("Cancel") { dismiss() } }
        }
    }
}
