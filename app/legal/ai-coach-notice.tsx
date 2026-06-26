import { LegalPage } from "@/components/LegalPage";

export default function AiCoachNoticeScreen() {
  return (
    <LegalPage
      title="AI Coach Data Use Notice"
      sections={[
        "AI Coach uses PacePilot-native activity data, onboarding data, race results, check-ins, plan history, and coach memory only when enabled.",
        "OpenAI API calls are routed through Supabase Edge Functions and the mobile app never receives the OpenAI API key.",
        "Raw prompt and response content is not stored by default unless the user explicitly enables history storage."
      ]}
    />
  );
}
