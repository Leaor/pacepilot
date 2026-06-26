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
      <SectionHeader title={title} caption="Placeholder content for MVP implementation." />
      <Card accent="orange">
        <Text variant="subheading">Legal Review Required</Text>
        <Text muted>TODO: Final policy language requires qualified legal review before production launch.</Text>
      </Card>
      {sections.map((section) => (
        <Card key={section} accent="cyan">
          <Text>{section}</Text>
        </Card>
      ))}
    </Screen>
  );
}
