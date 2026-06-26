import { Mail, MessageCircleQuestion } from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { colors, spacing } from "@/lib/theme";

const supportItems = [
  "Billing and subscriptions",
  "Training plan questions",
  "Data export or deletion",
  "AI Coach data use",
  "Race import corrections"
];

export default function SupportScreen() {
  return (
    <Screen>
      <SectionHeader title="Support" caption="MVP support placeholders for subscription and training issues." />
      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Premium Support Placeholder</Text>
          <MessageCircleQuestion color={colors.cyan} size={22} />
        </View>
        <Text muted>Elite support routing can be connected to a ticketing tool after launch readiness review.</Text>
      </Card>
      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">Contact Topics</Text>
          <Mail color={colors.green} size={22} />
        </View>
        {supportItems.map((item) => (
          <Text key={item} muted>
            {item}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  }
});
