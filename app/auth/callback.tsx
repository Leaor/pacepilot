import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import { CheckCircle, ShieldAlert } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { colors, spacing } from "@/lib/theme";

type CallbackState =
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function currentWebHref(): string | null {
  if (typeof globalThis !== "object" || !("location" in globalThis)) {
    return null;
  }

  const location = (globalThis as { location?: { href?: string } }).location;
  return typeof location?.href === "string" ? location.href : null;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const observedUrl = Linking.useURL();
  const { completeAuthCallback } = useAuth();
  const didStart = useRef(false);
  const [state, setState] = useState<CallbackState>({
    status: "loading",
    message: "Completing secure sign-in..."
  });

  useEffect(() => {
    if (didStart.current) {
      return;
    }

    let isActive = true;

    async function complete() {
      const initialUrl = observedUrl ?? await Linking.getInitialURL() ?? currentWebHref();
      if (!initialUrl) {
        if (isActive) {
          setState({
            status: "error",
            message: "The secure sign-in link could not be read. Request a new link and try again."
          });
        }
        return;
      }

      if (didStart.current) {
        return;
      }
      didStart.current = true;

      const result = await completeAuthCallback(initialUrl);
      if (!isActive) {
        return;
      }

      if (!result.ok) {
        setState({ status: "error", message: result.message });
        return;
      }

      setState({
        status: "success",
        message: result.destination === "updatePassword" ? "Reset link verified." : "Signed in."
      });
      router.replace(result.destination === "updatePassword" ? "/update-password" : "/today");
    }

    void complete();

    return () => {
      isActive = false;
    };
  }, [completeAuthCallback, observedUrl, router]);

  const isSuccess = state.status === "success";

  return (
    <Screen>
      <SectionHeader title="Secure Link" caption="PacePilot is verifying this account link." />
      <Card accent={state.status === "error" ? "red" : "green"}>
        <View style={styles.headerRow}>
          <Text variant="subheading">{isSuccess ? "Link verified" : state.status === "error" ? "Link failed" : "Verifying"}</Text>
          {state.status === "error" ? (
            <ShieldAlert color={colors.red} size={22} />
          ) : (
            <CheckCircle color={colors.green} size={22} />
          )}
        </View>
        <Text muted>{state.message}</Text>
        {state.status === "error" ? (
          <View style={styles.actions}>
            <Link href="/sign-in" style={styles.link}>
              Back to sign in
            </Link>
            <ActionButton label="Request a new reset link" variant="secondary" onPress={() => router.replace("/reset-password")} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  actions: {
    gap: spacing.sm
  },
  link: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "700"
  }
});
