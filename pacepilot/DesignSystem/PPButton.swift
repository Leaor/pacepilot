import SwiftUI

enum PPButtonRole {
    case primary
    case secondary
    case quiet
    case destructive
}

struct PPButton: View {
    let title: String
    var systemImage: String?
    var role: PPButtonRole = .primary
    var isFullWidth = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: PPSpacing.sm) {
                if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title)
                    .font(PPTypography.headline)
            }
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .minHeight(48)
            .padding(.horizontal, PPSpacing.md)
            .background(background)
            .foregroundStyle(foreground)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(border)
        }
        .buttonStyle(.plain)
    }

    private var background: some ShapeStyle {
        switch role {
        case .primary: return AnyShapeStyle(PPColors.orangeGradient)
        case .secondary: return AnyShapeStyle(PPColors.surfaceLight)
        case .quiet: return AnyShapeStyle(Color.clear)
        case .destructive: return AnyShapeStyle(PPColors.error.opacity(0.18))
        }
    }

    private var foreground: Color {
        switch role {
        case .quiet: PPColors.textMuted
        case .destructive: PPColors.error
        default: PPColors.textWhite
        }
    }

    private var border: some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .stroke(role == .quiet ? PPColors.surfaceLight : Color.clear, lineWidth: 1)
    }
}

private extension View {
    func minHeight(_ height: CGFloat) -> some View {
        frame(minHeight: height)
    }
}
