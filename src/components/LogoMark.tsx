import { Image, StyleSheet, View } from "react-native";
import { colors } from "@/lib/theme";

type LogoMarkProps = {
  size?: number;
};

export function LogoMark({ size = 56 }: LogoMarkProps) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: Math.max(12, size * 0.22) }]}>
      <Image
        accessibilityLabel="PacePilot logo"
        resizeMode="contain"
        source={require("../../assets/brand/pacepilot-mark.png")}
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.cream,
    overflow: "hidden"
  }
});
