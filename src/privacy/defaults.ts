import type { PrivacyPreferences } from "@/lib/types";

export const defaultPrivacyPreferences: PrivacyPreferences = {
  profilePrivate: true,
  activityPrivate: true,
  marketingOptIn: false,
  analyticsOptIn: false,
  aiCoachEnabled: false,
  allowActivityDataForAi: false,
  allowCheckInsForAi: false,
  allowProfileForAi: false,
  saveAiChatHistory: false,
  gpsRouteStorageEnabled: false
};

export function canStoreAiChatHistory(preferences: PrivacyPreferences): boolean {
  return preferences.aiCoachEnabled && preferences.saveAiChatHistory;
}
