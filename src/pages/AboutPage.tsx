import { BrandShell } from "@/components/BrandShell";
import { navigate } from "@/lib/nav";

export function AboutPage() {
  return (
    <BrandShell title="About Arigato Labs">
      <p>
        <strong>NoteSeen</strong> is a product of <strong>Arigato Labs</strong>.
      </p>
      <p>
        Built by <strong>Kumar Devanshu</strong>, founder of Arigato Labs (2026).
      </p>
      <p>
        We build sleek, modern, high-performance tools that help people get things done with clarity
        and calm. Software should feel fast, natural, and carefully designed.
      </p>
      <p>
        <button
          type="button"
          onClick={() => navigate("/contact")}
          className="text-action underline underline-offset-2"
        >
          Contact us
        </button>
      </p>
      <p className="ns-micro text-muted">Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
    </BrandShell>
  );
}
