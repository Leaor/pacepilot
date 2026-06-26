import { LegalPage } from "@/components/LegalPage";

export default function TermsScreen() {
  return (
    <LegalPage
      title="Terms"
      sections={[
        "Define acceptable app use, account responsibility, subscription access, and service changes.",
        "Clarify that training outputs are educational guidance and users remain responsible for training choices.",
        "Include dispute, limitation, and termination placeholders for legal review."
      ]}
    />
  );
}
