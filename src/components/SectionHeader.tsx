import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { spacing } from "@/lib/theme";

type SectionHeaderProps = {
  title: string;
  caption?: string;
};

export function SectionHeader({ title, caption }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text variant="heading">{title}</Text>
      {caption ? (
        <Text variant="body" muted>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs
  }
});
