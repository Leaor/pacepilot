import { describe, expect, it } from "vitest";
import { buildWorkoutCalendar } from "@/calendar/ics";
import { demoWorkouts } from "@/data/demo";
import { filterEvents, type RaceEvent } from "@/events/filters";
import { canStoreAiChatHistory, defaultPrivacyPreferences } from "@/privacy/defaults";
import { hasFeature } from "@/subscriptions/gates";

describe("privacy, subscriptions, exports, and events", () => {
  it("defaults AI chat history saving to off", () => {
    expect(canStoreAiChatHistory(defaultPrivacyPreferences)).toBe(false);
  });

  it("gates Pro and Elite features", () => {
    expect(hasFeature("free", "adaptive_plans")).toBe(false);
    expect(hasFeature("pro", "calendar_export")).toBe(true);
    expect(hasFeature("pro", "ai_race_strategy")).toBe(false);
    expect(hasFeature("elite", "ai_race_strategy")).toBe(true);
  });

  it("builds an ICS calendar from workouts", () => {
    const calendar = buildWorkoutCalendar(demoWorkouts);

    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("Easy aerobic run");
    expect(calendar).toContain("END:VCALENDAR");
  });

  it("filters events by featured, terrain, and country", () => {
    const events: RaceEvent[] = [
      {
        id: "1",
        name: "City Half",
        distanceKm: 21.1,
        city: "Toronto",
        country: "CA",
        date: "2026-10-18",
        terrainTags: ["flat"],
        vibeTags: ["fast"],
        featured: true
      },
      {
        id: "2",
        name: "Trail 10K",
        distanceKm: 10,
        city: "Boulder",
        country: "US",
        date: "2026-09-01",
        terrainTags: ["trail"],
        vibeTags: ["community"],
        featured: false
      }
    ];

    expect(filterEvents(events, { country: "CA", terrainTag: "flat", featuredOnly: true })).toHaveLength(1);
  });
});
