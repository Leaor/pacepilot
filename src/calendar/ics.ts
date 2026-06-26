import type { Workout } from "@/lib/types";

function toIcsDate(date: string): string {
  return date.replaceAll("-", "");
}

function escapeText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
}

export function buildWorkoutCalendar(workouts: Workout[]): string {
  const events = workouts.map((workout) => {
    const distance = workout.distanceKm ? `${workout.distanceKm} km` : `${workout.durationMinutes ?? 0} min`;
    return [
      "BEGIN:VEVENT",
      `UID:${workout.id}@pacepilot`,
      `DTSTAMP:${toIcsDate(workout.scheduledDate)}T120000Z`,
      `DTSTART;VALUE=DATE:${toIcsDate(workout.scheduledDate)}`,
      `SUMMARY:${escapeText(workout.title)}`,
      `DESCRIPTION:${escapeText(`${distance} ${workout.type} workout. Purpose: ${workout.purpose}.`)}`,
      "END:VEVENT"
    ].join("\r\n");
  });

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PacePilot//Training Plan//EN", ...events, "END:VCALENDAR"].join(
    "\r\n"
  );
}
