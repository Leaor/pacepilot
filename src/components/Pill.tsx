import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/lib/theme";
import { Text } from "@/components/Text";

type PillProps = {
  label: string;
  tone?: "cyan" | "orange" | "green" | "purple" | "red" | "yellow";
};

export function Pill({ label, tone = "cyan" }: PillProps) {
  return (
    <View style={[styles.pill, { borderColor: colors[tone] }]}>
      <Text variant="small">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  }
});
