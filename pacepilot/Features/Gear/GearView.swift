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
    let shoe: Shoe

    var body: some View {
        List {
            Section("Shoe") {
                Label(shoe.brand, systemImage: "tag")
                Label(shoe.model, systemImage: "shoeprints.fill")
                Label(shoe.nickname, systemImage: "quote.bubble")
                Label(shoe.purchaseDate.formatted(date: .abbreviated, time: .omitted), systemImage: "calendar")
            }
            Section("Mileage") {
                ProgressView(value: shoe.progress)
                    .tint(PPColors.orange)
                Text(String(format: "%.0f km current", shoe.currentMileage))
                Text(String(format: "%.0f km retirement target", shoe.retirementMileageTarget))
            }
            Section("History") {
                Text("Assigned activity history appears here after production sync.")
                Button("Mark retired") {}
            }
            Section("Notes") {
                Text(shoe.notes)
            }
        }
        .scrollContentBackground(.hidden)
        .background(PPColors.backgroundNavy)
        .navigationTitle(shoe.nickname)
    }
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
