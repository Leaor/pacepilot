import { Redirect, Tabs } from "expo-router";
import { Activity, CalendarDays, Compass, MessageCircle, User, Waves } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { canAccessAppRoutes, shouldHoldAppRoutes, shouldRedirectToSignIn } from "@/auth/access";
import { colors } from "@/lib/theme";

export default function AppTabsLayout() {
  const { configured, loading, session } = useAuth();
  const authRouteState = { configured, loading, hasSession: Boolean(session) };

  if (shouldHoldAppRoutes(authRouteState)) {
    return (
      <View style={styles.loadingScreen} accessibilityRole="progressbar" accessibilityLabel="Checking account session">
        <ActivityIndicator color={colors.cyan} />
      </View>
    );
  }

  if (shouldRedirectToSignIn(authRouteState) || !canAccessAppRoutes(authRouteState)) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.textMuted
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, size }) => <Waves color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  }
});
