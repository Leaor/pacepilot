import type { ReactNode } from "react";
import { StyleSheet, Text as NativeText } from "react-native";
import { colors, typography } from "@/lib/theme";

type TextProps = {
  children: ReactNode;
  variant?: "title" | "heading" | "subheading" | "body" | "small" | "label";
  muted?: boolean;
};

export function Text({ children, variant = "body", muted = false }: TextProps) {
  return <NativeText style={[styles.base, styles[variant], muted ? styles.muted : null]}>{children}</NativeText>;
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    letterSpacing: 0
  },
  title: {
    fontSize: typography.title,
    fontWeight: "800",
    lineHeight: 38
  },
  heading: {
    fontSize: typography.heading,
    fontWeight: "800",
    lineHeight: 28
  },
  subheading: {
    fontSize: typography.subheading,
    fontWeight: "700",
    lineHeight: 24
  },
  body: {
    fontSize: typography.body,
    lineHeight: 22
  },
  small: {
    fontSize: typography.small,
    lineHeight: 17
  },
  label: {
    fontSize: typography.small,
    fontWeight: "700",
    lineHeight: 16,
    textTransform: "uppercase"
  },
  muted: {
    color: colors.textMuted
  }
});
