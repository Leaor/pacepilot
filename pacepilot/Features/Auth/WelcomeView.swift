import SwiftUI

struct WelcomeView: View {
    @EnvironmentObject private var appState: AppState
    @State private var screen: AuthMode = .welcome

    var body: some View {
        NavigationStack {
            ZStack {
                PPColors.heroGradient.ignoresSafeArea()
                VStack(spacing: PPSpacing.xl) {
                    Spacer()
                    VStack(spacing: PPSpacing.md) {
                        Image("PacePilotLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 92, height: 92)
                            .shadow(color: PPColors.orange.opacity(0.42), radius: 24, x: 0, y: 10)
                        Text("PacePilot")
                            .font(PPTypography.largeTitle)
                            .foregroundStyle(PPColors.textWhite)
                        Text("Your smarter running co-pilot.")
                            .font(PPTypography.body)
                            .foregroundStyle(PPColors.textMuted)
                    }

                    VStack(spacing: PPSpacing.md) {
                        NavigationLink {
                            OnboardingView()
                        } label: {
                            Label("Preview Plan Setup", systemImage: "sparkles")
                                .frame(maxWidth: .infinity)
                                .minHeight(50)
                        }
                        .buttonStyle(PPLinkButtonStyle(role: .primary))

                        Button {
                            screen = .createAccount
                        } label: {
                            Label("Create Account", systemImage: "person.badge.plus")
                                .frame(maxWidth: .infinity)
                                .minHeight(50)
                        }
                        .buttonStyle(PPLinkButtonStyle(role: .secondary))

                        Button {
                            screen = .signIn
                        } label: {
                            Label("Sign In", systemImage: "person.crop.circle")
                                .frame(maxWidth: .infinity)
                                .minHeight(50)
                        }
                        .buttonStyle(PPLinkButtonStyle(role: .secondary))

                        Button {
                            appState.activateDemoMode()
                        } label: {
                            Label("Preview Sample Plan", systemImage: "play.fill")
                                .frame(maxWidth: .infinity)
                                .minHeight(50)
                        }
                        .buttonStyle(PPLinkButtonStyle(role: .quiet))
                    }
                    .padding(.horizontal, PPSpacing.lg)

                    Spacer()

                    Text("Secure accounts, privacy-first coaching, and training data that stays under your control.")
                        .font(PPTypography.caption)
                        .foregroundStyle(PPColors.textMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, PPSpacing.xl)
                        .padding(.bottom, PPSpacing.lg)
                }
            }
            .sheet(isPresented: Binding(get: { screen != .welcome }, set: { if !$0 { screen = .welcome } })) {
                switch screen {
                case .signIn: SignInView()
                case .createAccount: CreateAccountView()
                case .magicLink: MagicLinkView()
                case .forgotPassword: ForgotPasswordView()
                case .demo: DemoModeView()
                case .welcome: EmptyView()
                }
            }
        }
    }
}

struct PPLinkButtonStyle: ButtonStyle {
    var role: PPButtonRole

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(PPTypography.headline)
            .padding(.horizontal, PPSpacing.md)
            .background(background)
            .foregroundStyle(role == .quiet ? PPColors.textMuted : PPColors.textWhite)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }

    private var background: some ShapeStyle {
        switch role {
        case .primary: AnyShapeStyle(PPColors.orangeGradient)
        case .secondary: AnyShapeStyle(PPColors.surfaceLight)
        case .quiet: AnyShapeStyle(Color.clear)
        case .destructive: AnyShapeStyle(PPColors.error.opacity(0.18))
        }
    }
}

private extension View {
    func minHeight(_ height: CGFloat) -> some View {
        frame(minHeight: height)
    }
}
