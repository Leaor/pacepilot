import SwiftUI

struct PPProgressRing: View {
    let value: Double
    var lineWidth: CGFloat = 10
    var color: Color = PPColors.orange

    var body: some View {
        ZStack {
            Circle()
                .stroke(PPColors.surfaceLight, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(max(value, 0), 1))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int(value * 100))%")
                .font(PPTypography.caption)
                .foregroundStyle(PPColors.textWhite)
        }
    }
}
