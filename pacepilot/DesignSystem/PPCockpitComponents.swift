import SwiftUI

struct PPCockpitMetric: View {
    let title: String
    let value: String
    var caption: String?
    var color: Color = PPColors.textWhite

    var body: some View {
        VStack(alignment: .leading, spacing: PPSpacing.xs) {
            Text(value)
                .font(PPTypography.metric)
                .foregroundStyle(color)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.72)
            Text(title)
                .font(PPTypography.caption)
                .foregroundStyle(PPColors.textMuted)
                .textCase(.uppercase)
            if let caption {
                Text(caption)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(PPColors.textMuted.opacity(0.85))
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(PPSpacing.sm)
        .background(PPColors.surfaceLight)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(PPColors.surfaceRaised.opacity(0.8), lineWidth: 1)
        )
    }
}

struct PPCircleIconButton: View {
    let systemImage: String
    var label: String
    var color: Color = PPColors.surfaceLight
    var foreground: Color = PPColors.textWhite
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.headline.weight(.bold))
                .frame(width: 46, height: 46)
                .background(color)
                .foregroundStyle(foreground)
                .clipShape(Circle())
                .overlay(Circle().stroke(PPColors.surfaceRaised, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

struct PPSourceChip: View {
    let title: String
    var isAllowed: Bool

    var body: some View {
        Label(title, systemImage: isAllowed ? "checkmark.shield.fill" : "nosign")
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .foregroundStyle(isAllowed ? PPColors.easyGreen : PPColors.warning)
            .background((isAllowed ? PPColors.easyGreen : PPColors.warning).opacity(0.14))
            .clipShape(Capsule())
    }
}
