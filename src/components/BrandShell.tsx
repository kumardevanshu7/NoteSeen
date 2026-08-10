import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/Logo";
import { navigate } from "@/lib/nav";

export function BrandShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between border-b border-hairline px-5 py-5 sm:px-10">
        <Wordmark />
        <button
          type="button"
          onClick={() => navigate("/")}
          className="ns-caption text-muted transition-colors hover:text-ink"
        >
          Home
        </button>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-10">
        <h1 className="ns-display text-ink">{title}</h1>
        <div className="ns-caption mt-8 space-y-5 text-body-muted [&_h2]:mt-10 [&_h2]:text-[18px] [&_h2]:font-medium [&_h2]:text-ink [&_strong]:text-ink [&_a]:text-action [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
