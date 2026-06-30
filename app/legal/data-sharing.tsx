import { LegalPage } from "@/components/LegalPage";

export default function DataSharingScreen() {
  return (
    <LegalPage
      title="Data Sharing Policy"
      sections={[
        "PacePilot uses Supabase for account and training data, RevenueCat for subscription status, OpenAI for opt-in AI coaching, and Strava only when a user connects Strava.",
        "State that Strava data is not used for AI, analytics, public leaderboards, or plan generation.",
        "Users can control AI coaching, activity data, check-in data, imports, analytics, and connected-service access from privacy and profile controls."
      ]}
    />
  );
}
