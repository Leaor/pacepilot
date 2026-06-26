import SwiftUI

struct EventsView: View {
    @EnvironmentObject private var appState: AppState
    @State private var query = ""
    @State private var terrain: TerrainTag?
    @State private var selectedEvent: RaceEvent?

    private var filteredEvents: [RaceEvent] {
        appState.events.filter { event in
            let matchesQuery = query.isEmpty || event.name.localizedCaseInsensitiveContains(query) || event.location.localizedCaseInsensitiveContains(query)
            let matchesTerrain = terrain == nil || event.terrain == terrain
            return matchesQuery && matchesTerrain
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Explore featured races")
                        .font(PPTypography.title)
                    TextField("Search by race, city, or country", text: $query)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            filterButton("All", isSelected: terrain == nil) { terrain = nil }
                            ForEach(TerrainTag.allCases) { tag in
                                filterButton(tag.title, isSelected: terrain == tag) { terrain = tag }
                            }
                        }
                    }
                }
                .listRowBackground(PPColors.surfaceNavy)

                Section("Featured") {
                    ForEach(filteredEvents) { event in
                        Button {
                            selectedEvent = event
                        } label: {
                            EventRow(event: event)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(PPColors.backgroundNavy)
            .ppTabSafeAreaPadding()
            .navigationTitle("Events")
            .sheet(item: $selectedEvent) { event in
                EventDetailView(event: event)
            }
        }
    }

    private func filterButton(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(PPTypography.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? PPColors.orange : PPColors.surfaceLight)
                .foregroundStyle(PPColors.textWhite)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct EventRow: View {
    let event: RaceEvent

    var body: some View {
        VStack(alignment: .leading, spacing: PPSpacing.sm) {
            HStack {
                Text(event.name)
                    .font(PPTypography.headline)
                    .foregroundStyle(PPColors.textWhite)
                Spacer()
                if event.isFeatured {
                    PPBadge(title: "Featured", color: PPColors.orange, systemImage: "star.fill")
                }
            }
            HStack {
                Label(event.location, systemImage: "mappin.and.ellipse")
                Label(String(format: "%.1f km", event.distanceKilometers), systemImage: "flag")
                Label(event.terrain.title, systemImage: "mountain.2")
            }
            .font(PPTypography.caption)
            .foregroundStyle(PPColors.textMuted)
            Text(event.date, format: .dateTime.month(.abbreviated).day().year())
                .font(PPTypography.caption)
                .foregroundStyle(PPColors.aiCyan)
        }
        .padding(.vertical, PPSpacing.sm)
    }
}

struct EventDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let event: RaceEvent
    @State private var showingStrategy = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: PPSpacing.lg) {
                    PPCard {
                        VStack(alignment: .leading, spacing: PPSpacing.md) {
                            PPBadge(title: event.vibe.title, color: PPColors.aiCyan, systemImage: "sparkles")
                            Text(event.name)
                                .font(PPTypography.largeTitle)
                            Text(event.location)
                                .foregroundStyle(PPColors.textMuted)
                            HStack {
                                Label(String(format: "%.1f km", event.distanceKilometers), systemImage: "flag")
                                Label(String(format: "%.0f m", event.elevationMeters), systemImage: "mountain.2")
                                Label(event.terrain.title, systemImage: "map")
                            }
                            .font(PPTypography.caption)
                            .foregroundStyle(PPColors.textMuted)
                        }
                    }

                    HStack {
                        PPButton(title: "Register", systemImage: "safari") {}
                        PPButton(title: "A-race", systemImage: "flag.fill", role: .secondary) {}
                    }
                    HStack {
                        PPButton(title: "B-race", systemImage: "flag", role: .secondary) {}
                        PPButton(title: "Create Plan", systemImage: "sparkles", role: .quiet) {}
                    }

                    PPButton(title: "Race Strategy Builder", systemImage: "map.fill") {
                        showingStrategy = true
                    }

                    RaceReadinessView()
                    RaceChecklistView()
                }
                .padding(PPSpacing.md)
            }
            .ppTabSafeAreaPadding()
            .ppScreen()
            .navigationTitle("Event")
            .toolbar { Button("Done") { dismiss() } }
            .sheet(isPresented: $showingStrategy) {
                RaceStrategyBuilderView(event: event)
            }
        }
    }
}
