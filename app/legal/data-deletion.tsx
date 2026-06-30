import { LegalPage } from "@/components/LegalPage";

export default function DataDeletionScreen() {
  return (
    <LegalPage
      title="Data Deletion Policy"
      sections={[
        "Users can request deletion of their PacePilot account, profile, training plans, activities, GPS routes, check-ins, shoes, race tools, support requests, and AI history.",
        "Connected Strava cache can be cleared during disconnect or account deletion. Billing, abuse-prevention, and legal records may be retained only for the period required by the applicable platform or law.",
        "Account deletion requests are routed through the Supabase delete-account-request Edge Function and recorded for follow-up."
      ]}
    />
  );
}
