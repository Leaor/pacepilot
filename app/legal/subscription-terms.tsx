import { LegalPage } from "@/components/LegalPage";

export default function SubscriptionTermsScreen() {
  return (
    <LegalPage
      title="Subscription Terms"
      sections={[
        "Define Free, Pro, and Elite feature gates.",
        "Reference RevenueCat-managed subscription status and platform billing policies.",
        "Explain renewal, cancellation, refund routing, and promotional access placeholders."
      ]}
    />
  );
}
