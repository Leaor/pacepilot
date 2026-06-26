import Foundation
import UserNotifications

struct NotificationService {
    func requestAuthorization() async throws -> Bool {
        try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
    }

    func scheduleWorkoutReminder(for workout: Workout) async throws {
        let content = UNMutableNotificationContent()
        content.title = "PacePilot workout"
        content.body = "\(workout.title) is on deck."
        content.sound = .default
        let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour], from: workout.scheduledDate), repeats: false)
        let request = UNNotificationRequest(identifier: workout.id.uuidString, content: content, trigger: trigger)
        try await UNUserNotificationCenter.current().add(request)
    }
}
