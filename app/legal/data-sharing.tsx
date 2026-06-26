import { LegalPage } from "@/components/LegalPage";

export default function DataSharingScreen() {
  return (
    <LegalPage
      title="Data Sharing Policy"
      sections={[
        "Describe service providers: Supabase, RevenueCat, OpenAI, and optional Strava integration.",
        "State that Strava data is not used for AI, analytics, public leaderboards, or plan generation.",
        "Describe consent-based sharing choices and opt-out controls."
      ]}
    />
  );
}
