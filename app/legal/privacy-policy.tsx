import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPolicyScreen() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        "Describe account data, training data, GPS data, check-ins, subscriptions, support requests, and AI coaching data.",
        "State that AI coaching is opt-in and uses only authorized PacePilot-native data.",
        "Document US and Canada privacy request handling for access, export, deletion, and correction."
      ]}
    />
  );
}
