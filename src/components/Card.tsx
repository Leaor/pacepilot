import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/lib/theme";

type CardProps = {
  children: ReactNode;
  accent?: "cyan" | "orange" | "green" | "purple" | "red" | "yellow";
};

export function Card({ children, accent = "cyan" }: CardProps) {
  return <View style={[styles.card, { borderTopColor: colors[accent] }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm
  }
});
