import type { Activity } from "@/lib/types";

export type GpsRecordingState = "idle" | "recording" | "paused" | "finished";

export type RoutePoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

export function createMockGpsActivity(points: RoutePoint[], durationSeconds: number): Activity {
  const distanceKm = Math.max(0.1, Math.round(points.length * 0.18 * 10) / 10);
  return {
    id: `gps-${Date.now()}`,
    source: "pacepilot_gps",
    title: "PacePilot GPS run",
    startedAt: points[0]?.timestamp ?? new Date().toISOString(),
    distanceKm,
    durationSeconds,
    averagePaceSecondsPerKm: Math.round(durationSeconds / distanceKm)
  };
}
