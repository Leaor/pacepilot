import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";

type LegalPageProps = {
  title: string;
  sections: string[];
};

export function LegalPage({ title, sections }: LegalPageProps) {
  return (
    <Screen>
      <SectionHeader title={title} caption="Policy summary for PacePilot account holders." />
      <Card accent="orange">
        <Text variant="subheading">Review Status</Text>
        <Text muted>Final public policy language should be reviewed by qualified counsel before App Store release.</Text>
      </Card>
      {sections.map((section) => (
        <Card key={section} accent="cyan">
          <Text>{section}</Text>
        </Card>
      ))}
    </Screen>
  );
}
