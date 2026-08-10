import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/Logo";
import { navigate } from "@/lib/nav";

export function ExplorePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <Wordmark />
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="ns-caption text-muted transition-colors hover:text-ink"
        >
          Open app
        </button>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-14 text-center sm:px-10">
        <p className="ns-mono text-muted">Our company</p>
        <h1 className="ns-display mt-4 text-ink">Arigato Labs</h1>
        <p className="ns-body-lg mx-auto mt-4 max-w-xl text-body-muted">
          Redefining productivity tools for the modern era.
        </p>

        <div className="mx-auto mt-12 max-w-[650px]">
          <img
            src="/arigato-labs-logo.png"
            alt="Arigato Labs"
            className="mx-auto h-auto w-full object-contain"
          />
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-[12px] text-ink">
            ✓ Verified Founder
          </span>
          <p className="ns-caption mt-6 text-body-muted">
            <strong className="text-ink">NoteSeen</strong> is proudly developed by{" "}
            <strong className="text-ink">Kumar Devanshu</strong>, the founder of{" "}
            <strong className="text-ink">Arigato Labs</strong> in 2026.
          </p>
          <p className="ns-caption mt-4 text-body-muted">
            Our mission is to build sleek, modern, and high-performance tools that empower
            individuals and teams to achieve their goals with elegance and ease. We believe
            software should feel natural, fast, and distinctly beautiful.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl border-t border-hairline pt-10">
          <p className="ns-mono text-muted">Arigato Labs</p>
          <p className="ns-caption mt-3 text-body-muted">
            Copyright © 2026 Arigato Labs. All Rights Reserved.
          </p>
          <p className="ns-caption mt-3 text-body-muted">
            <strong className="text-ink">NoteSeen</strong> is a product of Arigato Labs, founded by
            Kumar Devanshu. Brand name and logos may not be reused outside Arigato Labs apps without
            permission.
          </p>
          <p className="ns-micro mt-4 text-muted">
            See Privacy, Terms, and Disclaimer in this app. Contact: kumardevanshu3001@gmail.com
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {[
              ["/about", "About"],
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
              ["/disclaimer", "Disclaimer"],
              ["/contact", "Contact"],
            ].map(([href, label]) => (
              <button
                key={href}
                type="button"
                onClick={() => navigate(href)}
                className="ns-caption text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
