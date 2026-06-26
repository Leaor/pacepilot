export type RaceEvent = {
  id: string;
  name: string;
  distanceKm: number;
  city: string;
  country: "US" | "CA";
  date: string;
  terrainTags: string[];
  vibeTags: string[];
  featured: boolean;
};

export type EventFilters = {
  distanceKm?: number;
  country?: "US" | "CA";
  terrainTag?: string;
  vibeTag?: string;
  featuredOnly?: boolean;
};

export function filterEvents(events: RaceEvent[], filters: EventFilters): RaceEvent[] {
  return events.filter((event) => {
    const distanceMatches = filters.distanceKm ? event.distanceKm === filters.distanceKm : true;
    const countryMatches = filters.country ? event.country === filters.country : true;
    const terrainMatches = filters.terrainTag ? event.terrainTags.includes(filters.terrainTag) : true;
    const vibeMatches = filters.vibeTag ? event.vibeTags.includes(filters.vibeTag) : true;
    const featuredMatches = filters.featuredOnly ? event.featured : true;

    return distanceMatches && countryMatches && terrainMatches && vibeMatches && featuredMatches;
  });
}
