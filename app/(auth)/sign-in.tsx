import { Link, useRouter } from "expo-router";
import { LogIn, Mail } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { LogoMark } from "@/components/LogoMark";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { useAuth } from "@/auth/AuthContext";
import { authSuccessMessage } from "@/auth/validation";
import { colors, spacing } from "@/lib/theme";

type PendingAuthAction = "signIn" | "signUp" | "magicLink";

export default function SignInScreen() {
  const router = useRouter();
  const { configured, signInWithPassword, signUpWithPassword, sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAuthAction | null>(null);

  async function handleSignIn() {
    if (pendingAction) return;
    setPendingAction("signIn");
    const nextMessage = await signInWithPassword(email, password);
    setMessage(nextMessage);
    setPendingAction(null);
    if (!nextMessage) {
      router.replace("/today");
    }
  }

  async function handleSignUp() {
    if (pendingAction) return;
    setPendingAction("signUp");
    setMessage((await signUpWithPassword(email, password)) ?? authSuccessMessage("signUp"));
    setPendingAction(null);
  }

  async function handleMagicLink() {
    if (pendingAction) return;
    setPendingAction("magicLink");
    setMessage((await sendMagicLink(email)) ?? authSuccessMessage("magicLink"));
    setPendingAction(null);
  }

  return (
    <Screen>
      <View style={styles.logoRow}>
        <LogoMark size={56} />
      </View>
      <SectionHeader
        title="Welcome back"
        caption="Sign in to keep your streak, saved plans, privacy controls, and coaching history."
      />
      {!configured ? (
        <Card accent="orange">
          <Text variant="subheading">Sample mode</Text>
          <Text muted>
            Account sync needs Supabase public configuration. You can still explore the sample training week.
          </Text>
          <Link href="/today" style={styles.link}>
            Continue to sample Today
          </Link>
        </Card>
      ) : null}
      <Card>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textContentType="emailAddress"
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          textContentType="password"
          value={password}
        />
        <View style={styles.actions}>
          <ActionButton
            label={pendingAction === "signIn" ? "Signing in..." : "Sign in"}
            icon={<LogIn color={colors.background} size={18} />}
            onPress={handleSignIn}
            disabled={Boolean(pendingAction)}
          />
          <ActionButton
            label={pendingAction === "signUp" ? "Creating..." : "Create account"}
            variant="secondary"
            onPress={handleSignUp}
            disabled={Boolean(pendingAction)}
          />
          <ActionButton
            label={pendingAction === "magicLink" ? "Sending..." : "Magic link"}
            icon={<Mail color={colors.text} size={18} />}
            variant="secondary"
            onPress={handleMagicLink}
            disabled={Boolean(pendingAction)}
          />
        </View>
        {message ? <Text muted>{message}</Text> : null}
        <Link href="/reset-password" style={styles.link}>
          Reset password
        </Link>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoRow: {
    alignItems: "center"
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16
  },
  actions: {
    gap: spacing.sm
  },
  link: {
    color: colors.cyan,
    fontSize: 15
  }
});
