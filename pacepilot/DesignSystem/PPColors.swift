import SwiftUI

enum PPColors {
    static let backgroundNavy = Color(hex: "071827")
    static let deepNavy = Color(hex: "04111D")
    static let surfaceNavy = Color(hex: "0D2233")
    static let surfaceLight = Color(hex: "102C42")
    static let surfaceRaised = Color(hex: "14344E")
    static let orange = Color(hex: "FF5A00")
    static let raceOrange = Color(hex: "FF7A1A")
    static let textWhite = Color(hex: "FFFFFF")
    static let textMuted = Color(hex: "A7B4C2")
    static let cream = Color(hex: "FFFDF8")
    static let easyGreen = Color(hex: "20C973")
    static let longRunPurple = Color(hex: "8B5CF6")
    static let aiCyan = Color(hex: "24D4FF")
    static let warning = Color(hex: "FFB020")
    static let error = Color(hex: "FF4D4F")
    static let mapInk = Color(hex: "062134")

    static let heroGradient = LinearGradient(
        colors: [deepNavy, backgroundNavy, surfaceNavy],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let orangeGradient = LinearGradient(
        colors: [orange, raceOrange],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var value: UInt64 = 0
        scanner.scanHexInt64(&value)
        let red = Double((value >> 16) & 0xff) / 255
        let green = Double((value >> 8) & 0xff) / 255
        let blue = Double(value & 0xff) / 255
        self.init(red: red, green: green, blue: blue)
    }
}
