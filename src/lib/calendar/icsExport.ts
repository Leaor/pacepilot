import type { PlanWorkout } from "@/lib/training/planGenerator";

function toIcsDate(date: string): string {
  return date.replaceAll("-", "");
}

function escapeText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
}

function categoryForWorkout(workout: PlanWorkout): string {
  if (workout.type === "long") return "Long Runs";
  if (workout.type === "tempo" || workout.type === "race_pace") return "Tempo / Race Pace";
  if (workout.type === "intervals" || workout.type === "hills") return "Speed / Hills";
  if (workout.type === "strength" || workout.type === "mobility") return "Strength / Mobility";
  if (workout.type === "rest" || workout.type === "recovery") return "Rest / Recovery";
  if (workout.type === "race") return "Race Days";
  return "Easy Runs";
}

export function exportTrainingPlanToIcs(workouts: PlanWorkout[], timezone = "America/Toronto"): string {
  const events = workouts.map((workout) => {
    const distance = workout.distanceKm ? `${workout.distanceKm} km` : `${workout.durationMinutes ?? 0} min`;
    const description = `${distance}. ${workout.notes}${workout.targetPace ? ` Target: ${workout.targetPace}.` : ""}`;

    return [
      "BEGIN:VEVENT",
      `UID:${workout.id}@pacepilot`,
      `DTSTAMP:${toIcsDate(workout.date)}T120000Z`,
      `DTSTART;VALUE=DATE:${toIcsDate(workout.date)}`,
      `SUMMARY:${escapeText(workout.title)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `CATEGORIES:${escapeText(categoryForWorkout(workout))}`,
      `X-PACEPILOT-TIMEZONE:${escapeText(timezone)}`,
      "END:VEVENT"
    ].join("\r\n");
  });

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PacePilot//Training Plan//EN", ...events, "END:VCALENDAR"].join(
    "\r\n"
  );
}
