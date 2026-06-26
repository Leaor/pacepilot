import { Link } from "expo-router";
import { Flag, MapPinned, Search } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { colors, spacing } from "@/lib/theme";
import { filterEvents, type RaceEvent } from "@/events/filters";
import { buildRaceStrategy } from "@/lib/race/raceStrategyBuilder";
import { createRaceWeekendChecklist } from "@/lib/race/raceChecklist";

const events: RaceEvent[] = [
  {
    id: "toronto-half",
    name: "Harbour City Marathon",
    distanceKm: 42.2,
    city: "Toronto",
    country: "CA",
    date: "2026-10-12",
    terrainTags: ["road", "flat"],
    vibeTags: ["pr", "scenic"],
    featured: true
  },
  {
    id: "riverside-half",
    name: "Riverside Half",
    distanceKm: 21.1,
    city: "Ottawa",
    country: "CA",
    date: "2026-11-09",
    terrainTags: ["road", "rolling"],
    vibeTags: ["beginner-friendly", "charity"],
    featured: true
  },
  {
    id: "summit-10k",
    name: "Summit Trail 10K",
    distanceKm: 10,
    city: "Boulder",
    country: "US",
    date: "2026-12-07",
    terrainTags: ["trail", "hilly"],
    vibeTags: ["scenic"],
    featured: true
  }
];

export default function EventsScreen() {
  const featured = filterEvents(events, { featuredOnly: true });
  const selectedEvent = featured[0];
  const strategy = buildRaceStrategy({
    distanceKm: selectedEvent.distanceKm,
    goalTimeSeconds: 3 * 60 * 60 + 45 * 60,
    pacingStyle: "conservative_start"
  });
  const checklist = createRaceWeekendChecklist(selectedEvent.name);

  return (
    <Screen>
      <SectionHeader title="Explore featured races" caption="Seeded events only for MVP. No scraping protected race sources." />
      <Card accent="cyan">
        <View style={styles.searchBar}>
          <Search color={colors.textMuted} size={18} />
          <Text muted>Search races, cities, distances...</Text>
        </View>
        <View style={styles.tags}>
          <Pill label="Marathon" tone="orange" />
          <Pill label="2026" />
          <Pill label="Flat" tone="green" />
          <Pill label="Scenic" tone="purple" />
        </View>
      </Card>

      {featured.map((event) => (
        <Card key={event.id} accent={event.id === selectedEvent.id ? "orange" : "cyan"}>
          <View style={styles.headerRow}>
            <View style={styles.copy}>
              <Text variant="subheading">{event.name}</Text>
              <Text muted>{`${event.city}, ${event.country} · ${event.date}`}</Text>
            </View>
            <MapPinned color={event.id === selectedEvent.id ? colors.orange : colors.cyan} size={22} />
          </View>
          <View style={styles.tags}>
            <Pill label={`${event.distanceKm} km`} />
            {event.terrainTags.map((tag) => (
              <Pill key={tag} label={tag} tone="green" />
            ))}
            {event.vibeTags.map((tag) => (
              <Pill key={tag} label={tag} tone="purple" />
            ))}
          </View>
          <View style={styles.buttonRow}>
            <ActionButton label="Create plan" variant={event.id === selectedEvent.id ? "primary" : "secondary"} />
            <ActionButton label="+A" variant="secondary" />
            <ActionButton label="+B" variant="secondary" />
          </View>
        </Card>
      ))}

      <Card accent="purple">
        <View style={styles.headerRow}>
          <Text variant="subheading">Race tools</Text>
          <Flag color={colors.purple} size={22} />
        </View>
        <Text muted>{`${strategy.splits.length} split race strategy, warm-up, fueling, hydration, and backup plan are generated deterministically for MVP.`}</Text>
        <Text muted>{`${checklist.length} race-weekend checklist items are ready for ${selectedEvent.name}.`}</Text>
        <Link href="/paywall" style={styles.link}>
          View Elite race tools
        </Link>
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
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  searchBar: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  link: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "700"
  }
});
