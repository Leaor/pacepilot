import type { PlanWorkout } from "@/lib/training/planGenerator";
import { buildWorkoutCues, type WorkoutCue } from "@/lib/audio/workoutCues";

export type AudioCoachSettings = {
  enabled: boolean;
  voiceStyle: "calm" | "direct" | "minimal";
  cueFrequency: "low" | "normal" | "high";
  paceAlerts: boolean;
  distanceAlerts: boolean;
  intervalCountdowns: boolean;
  racePaceAlerts: boolean;
};

export function createAudioCoachSession(workout: PlanWorkout, settings: AudioCoachSettings): WorkoutCue[] {
  if (!settings.enabled) {
    return [];
  }

  const cues = buildWorkoutCues(workout);
  return settings.cueFrequency === "low" ? cues.filter((cue) => cue.atPercent === 0 || cue.atPercent >= 90) : cues;
}
