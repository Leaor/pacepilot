import { CheckCircle2 } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { colors, spacing } from "@/lib/theme";

const tiers = [
  {
    name: "Free",
    tone: "green" as const,
    features: ["1 active plan", "Manual activity logging", "Limited event browsing", "Basic weekly insights"]
  },
  {
    name: "Pro",
    tone: "cyan" as const,
    features: ["Unlimited plans", "Adaptive training", "Shoe mileage tracker", "Progress dashboard", "Calendar export"]
  },
  {
    name: "Elite",
    tone: "purple" as const,
    features: ["AI Coach chatbot", "Race Strategy Builder", "Race Readiness Score", "Race Weekend Checklist", "Audio Coach"]
  }
];

export default function PaywallScreen() {
  return (
    <Screen>
      <SectionHeader title="Upgrade" caption="RevenueCat-ready subscriptions with local mock mode for development." />
      {tiers.map((tier) => (
        <Card key={tier.name} accent={tier.tone}>
          <View style={styles.headerRow}>
            <Text variant="subheading">{tier.name}</Text>
            <Pill label={tier.name === "Free" ? "Included" : "Premium"} tone={tier.tone} />
          </View>
          {tier.features.map((feature) => (
            <View key={feature} style={styles.row}>
              <CheckCircle2 color={colors[tier.tone]} size={18} />
              <Text>{feature}</Text>
            </View>
          ))}
          {tier.name !== "Free" ? <ActionButton label={`Choose ${tier.name}`} variant="secondary" /> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  }
});
