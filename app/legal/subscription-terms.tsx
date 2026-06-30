import { LegalPage } from "@/components/LegalPage";

export default function SubscriptionTermsScreen() {
  return (
    <LegalPage
      title="Subscription Terms"
      sections={[
        "Free includes one active plan, manual logging, basic events, and basic weekly insights. Pro adds unlimited plans, adaptive training, gear tracking, progress tools, and calendar export. Elite adds AI Coach, race strategy, readiness, race checklists, audio coaching, and priority support.",
        "Subscription status is managed through RevenueCat and the applicable App Store billing system.",
        "Renewals, cancellations, refunds, trials, and promotional access follow the policies of the platform where the subscription was purchased."
      ]}
    />
  );
}
