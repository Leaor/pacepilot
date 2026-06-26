import { LegalPage } from "@/components/LegalPage";

export default function DataDeletionScreen() {
  return (
    <LegalPage
      title="Data Deletion Policy"
      sections={[
        "Describe account deletion, activity deletion, route deletion, AI history deletion, and Strava cached-data deletion.",
        "Explain retention windows for billing, abuse prevention, and legal obligations.",
        "Route deletion requests through the Supabase `delete-account-request` Edge Function."
      ]}
    />
  );
}
