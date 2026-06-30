export type AuthRouteState = {
  configured: boolean;
  loading: boolean;
  hasSession: boolean;
};

export function canAccessAppRoutes(state: AuthRouteState): boolean {
  return !state.configured || state.hasSession;
}

export function shouldHoldAppRoutes(state: AuthRouteState): boolean {
  return state.configured && state.loading && !state.hasSession;
}

export function shouldRedirectToSignIn(state: AuthRouteState): boolean {
  return state.configured && !state.loading && !state.hasSession;
}
