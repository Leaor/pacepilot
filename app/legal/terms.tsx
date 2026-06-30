import { LegalPage } from "@/components/LegalPage";

export default function TermsScreen() {
  return (
    <LegalPage
      title="Terms"
      sections={[
        "Define acceptable app use, account responsibility, subscription access, and service changes.",
        "Clarify that training outputs are educational guidance and users remain responsible for training choices.",
        "PacePilot may limit or terminate access for misuse, safety risk, platform abuse, or violation of subscription and connected-service requirements."
      ]}
    />
  );
}
