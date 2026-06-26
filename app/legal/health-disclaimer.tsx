import { LegalPage } from "@/components/LegalPage";

export default function HealthDisclaimerScreen() {
  return (
    <LegalPage
      title="Health Disclaimer"
      sections={[
        "Training guidance is educational and not medical advice.",
        "AI Coach must not diagnose, treat, or provide injury recovery instructions.",
        "Users should consult qualified professionals for medical concerns, pain, or injury symptoms."
      ]}
    />
  );
}
