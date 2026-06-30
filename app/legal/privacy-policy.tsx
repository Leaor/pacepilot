import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPolicyScreen() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        "PacePilot stores account data, training plans, workouts, activities, GPS routes when enabled, check-ins, subscriptions, support requests, and AI coaching metadata.",
        "AI coaching is opt-in and uses only authorized PacePilot-native data, user-provided imports, permitted health data, and chat text.",
        "Users in the United States and Canada can request access, export, deletion, and correction through the Privacy Center and support channels."
      ]}
    />
  );
}
