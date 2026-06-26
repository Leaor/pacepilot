import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, spacing } from "@/lib/theme";
import { Text } from "@/components/Text";

type ActionButtonProps = {
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary";
};

export function ActionButton({ label, icon, onPress, variant = "primary" }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" ? styles.primary : styles.secondary,
        pressed ? styles.pressed : null
      ]}
    >
      <View style={styles.row}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text variant="body">{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  primary: {
    backgroundColor: colors.orange
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1
  },
  pressed: {
    opacity: 0.82
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  icon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center"
  }
});
