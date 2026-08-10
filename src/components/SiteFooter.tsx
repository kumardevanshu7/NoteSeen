import { navigate } from "@/lib/nav";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-hairline px-5 py-10 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ns-mono text-muted">Arigato Labs</p>
          <p className="ns-caption mt-2 max-w-md text-body-muted">
            NoteSeen is a product of Arigato Labs, founded by Kumar Devanshu in 2026.
          </p>
          <p className="ns-micro mt-3 text-muted">Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {LINKS.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => navigate(link.href)}
              className="ns-caption text-muted transition-colors hover:text-ink"
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>
    </footer>
  );
}
