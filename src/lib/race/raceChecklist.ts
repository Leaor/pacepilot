export type RaceChecklistItem = {
  id: string;
  label: string;
  category: "logistics" | "gear" | "fuel" | "safety" | "recovery";
  complete: boolean;
};

export function createRaceWeekendChecklist(raceTitle: string): RaceChecklistItem[] {
  const labels: Array<Omit<RaceChecklistItem, "complete">> = [
    { id: "address", label: `${raceTitle} address and start time`, category: "logistics" },
    { id: "bib", label: "Bib pickup details", category: "logistics" },
    { id: "parking", label: "Parking or transit plan", category: "logistics" },
    { id: "shoes", label: "Race shoes", category: "gear" },
    { id: "watch", label: "Watch and charger", category: "gear" },
    { id: "fuel", label: "Gels, fuel, and hydration", category: "fuel" },
    { id: "outfit", label: "Race outfit checked against weather", category: "gear" },
    { id: "corral", label: "Start corral and warm-up time", category: "logistics" },
    { id: "contact", label: "Emergency contact placeholder", category: "safety" },
    { id: "recovery", label: "Post-race recovery items", category: "recovery" }
  ];

  return labels.map((item) => ({ ...item, complete: false }));
}

export function toggleChecklistItem(items: RaceChecklistItem[], id: string): RaceChecklistItem[] {
  return items.map((item) => (item.id === id ? { ...item, complete: !item.complete } : item));
}
