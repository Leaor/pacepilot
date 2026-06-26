import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Group {
            if appState.isAuthenticated || appState.isDemoMode {
                PacePilotTabView()
            } else {
                WelcomeView()
            }
        }
        .animation(.smooth(duration: 0.28), value: appState.isAuthenticated)
        .animation(.smooth(duration: 0.28), value: appState.isDemoMode)
    }
}

struct PacePilotTabView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            TodayView()
                .tag(AppTab.today)
                .tabItem { Label("Today", systemImage: "sun.max.fill") }

            PlanView()
                .tag(AppTab.plan)
                .tabItem { Label("Plan", systemImage: "calendar") }

            ActivitiesView()
                .tag(AppTab.activities)
                .tabItem { Label("Activities", systemImage: "figure.run") }

            EventsView()
                .tag(AppTab.events)
                .tabItem { Label("Events", systemImage: "flag.checkered") }

            CoachView()
                .tag(AppTab.coach)
                .tabItem { Label("Coach", systemImage: "bubble.left.and.bubble.right.fill") }

            ProfileView()
                .tag(AppTab.profile)
                .tabItem { Label("Profile", systemImage: "person.crop.circle") }
        }
        .tint(PPColors.orange)
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
