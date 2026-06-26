import SwiftUI

struct PPCard<Content: View>: View {
    private let padding: CGFloat
    private let content: Content

    init(padding: CGFloat = PPSpacing.md, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .background(PPColors.surfaceNavy)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(PPColors.surfaceLight.opacity(0.9), lineWidth: 1)
            )
    }
}

extension View {
    func ppScreen() -> some View {
        background(PPColors.backgroundNavy.ignoresSafeArea())
    }

    func ppTabSafeAreaPadding() -> some View {
        safeAreaPadding(.bottom, 88)
    }
}
