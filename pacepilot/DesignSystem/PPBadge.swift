import SwiftUI

struct PPBadge: View {
    let title: String
    var color: Color = PPColors.aiCyan
    var systemImage: String?

    var body: some View {
        HStack(spacing: 6) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.caption2.weight(.bold))
            }
            Text(title)
                .font(PPTypography.caption)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .foregroundStyle(color)
        .background(color.opacity(0.14))
        .clipShape(Capsule())
    }
}
