export type AuthAction = "signIn" | "signUp" | "magicLink" | "resetPassword" | "updatePassword";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!normalizeEmail(email)) {
    return "Enter your email address.";
  }

  if (!emailPattern.test(normalizeEmail(email))) {
    return "Enter a valid email address.";
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Enter your password.";
  }

  return null;
}

export function validateNewPassword(password: string): string | null {
  if (!password) {
    return "Create a password.";
  }

  if (password.length < 8) {
    return "Use at least 8 characters for your password.";
  }

  return null;
}

export function accountServicesUnavailableMessage(): string {
  return "Account services are not configured for this preview.";
}

export function profileSetupFailureMessage(): string {
  return "Signed in, but profile setup could not be completed. Please try again.";
}

export function safeAuthFailureMessage(action: AuthAction): string {
  switch (action) {
    case "signIn":
      return "Could not sign in. Check your email and password.";
    case "signUp":
      return "Could not create the account. Check your details and try again.";
    case "magicLink":
      return "Could not send a magic link. Check the email address and try again.";
    case "resetPassword":
      return "Could not request a reset link. Check the email address and try again.";
    case "updatePassword":
      return "Could not update the password. Request a new reset link and try again.";
  }
}

export function authSuccessMessage(action: Extract<AuthAction, "signUp" | "magicLink" | "resetPassword">): string {
  switch (action) {
    case "signUp":
      return "Account created. Check your email if confirmation is required.";
    case "magicLink":
      return "If the email is eligible, a secure sign-in link will be sent.";
    case "resetPassword":
      return "If an account exists for that email, a reset link will be sent.";
  }
}
