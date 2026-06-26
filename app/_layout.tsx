import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/auth/AuthContext";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/index" options={{ title: "Calibration" }} />
        <Stack.Screen name="paywall" options={{ title: "Upgrade" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy & Data" }} />
        <Stack.Screen name="support" options={{ title: "Support" }} />
        <Stack.Screen name="legal/privacy-policy" options={{ title: "Privacy Policy" }} />
        <Stack.Screen name="legal/terms" options={{ title: "Terms" }} />
        <Stack.Screen name="legal/subscription-terms" options={{ title: "Subscription Terms" }} />
        <Stack.Screen name="legal/health-disclaimer" options={{ title: "Health Disclaimer" }} />
        <Stack.Screen name="legal/data-deletion" options={{ title: "Data Deletion" }} />
        <Stack.Screen name="legal/data-sharing" options={{ title: "Data Sharing" }} />
        <Stack.Screen name="legal/ai-coach-notice" options={{ title: "AI Coach Notice" }} />
      </Stack>
    </AuthProvider>
  );
}
