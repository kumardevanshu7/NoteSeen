import { BrandShell } from "@/components/BrandShell";

export function DisclaimerPage() {
  return (
    <BrandShell title="Disclaimer">
      <p>
        NoteSeen and Arigato Labs materials are provided <strong>“as is”</strong> without warranties
        of any kind.
      </p>
      <p>
        Arigato Labs is <strong>not liable</strong> for loss of data, profits, or damages arising from
        use or inability to use the app, to the maximum extent allowed by law.
      </p>
      <p>
        Productivity helpers and stored prompts are aids — not professional legal, medical, or
        financial advice.
      </p>
      <p>Third-party services (Google, Firebase, hosts) have their own terms.</p>
      <p className="ns-micro text-muted">Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
    </BrandShell>
  );
}
