import { BrandShell } from "@/components/BrandShell";

export function TermsPage() {
  return (
    <BrandShell title="Terms & Conditions">
      <p className="ns-micro text-muted">Last updated: 2026</p>

      <h2>Agreement</h2>
      <p>Using NoteSeen means you accept these terms.</p>

      <h2>The service</h2>
      <p>
        NoteSeen is provided by Arigato Labs as a notes and prompts app with optional cloud sync.
      </p>

      <h2>Accounts</h2>
      <p>You are responsible for your Google login and the content you add.</p>

      <h2>Acceptable use</h2>
      <p>
        Do not abuse the service, attempt to break security, scrape in a way that harms the product,
        or store illegal content.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Arigato Labs name, logos, and brand assets are owned by Arigato Labs. Do not reuse them
        outside Arigato Labs apps without permission.
      </p>

      <h2>Availability</h2>
      <p>The service may change, break, or stop. No uptime guarantee is provided.</p>

      <h2>Termination</h2>
      <p>We may suspend abuse. You may stop using the app anytime.</p>

      <h2>Governing note</h2>
      <p>Disputes are handled under applicable law in India unless later specified otherwise.</p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:kumardevanshu3001@gmail.com">kumardevanshu3001@gmail.com</a>
      </p>
    </BrandShell>
  );
}
