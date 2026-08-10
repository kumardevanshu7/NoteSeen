import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { useAppDeepLinkRedirect, usePath } from "@/lib/nav";
import { hideBootSplash } from "@/lib/boot";

const LandingPage = lazy(() =>
  import("@/components/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const AppShell = lazy(() =>
  import("@/components/AppShell").then((m) => ({ default: m.AppShell })),
);
const AuthGate = lazy(() =>
  import("@/components/AuthGate").then((m) => ({ default: m.AuthGate })),
);
const ExplorePage = lazy(() =>
  import("@/pages/ExplorePage").then((m) => ({ default: m.ExplorePage })),
);
const AboutPage = lazy(() =>
  import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })),
);
const PrivacyPage = lazy(() =>
  import("@/pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("@/pages/TermsPage").then((m) => ({ default: m.TermsPage })),
);
const DisclaimerPage = lazy(() =>
  import("@/pages/DisclaimerPage").then((m) => ({ default: m.DisclaimerPage })),
);
const ContactPage = lazy(() =>
  import("@/pages/ContactPage").then((m) => ({ default: m.ContactPage })),
);

function RouteFallback() {
  return (
    <div className="flex h-full min-h-dvh items-center justify-center bg-canvas">
      <span className="ns-mono text-muted">Loading…</span>
    </div>
  );
}

function AuthApp() {
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void import("@/store/auth").then(({ useAuth }) => {
      if (cancelled) return;
      unsub = useAuth.getState().initAuth();
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}

export default function App() {
  const path = usePath();
  useAppDeepLinkRedirect();

  useEffect(() => {
    // Legal/marketing pages: drop splash as soon as the light shell paints.
    if (!path.startsWith("/app")) {
      const t = window.setTimeout(() => hideBootSplash(), 80);
      return () => window.clearTimeout(t);
    }
  }, [path]);

  let page: ReactNode = <LandingPage />;
  if (path === "/app" || path.startsWith("/app/")) page = <AuthApp />;
  else if (path === "/explore") page = <ExplorePage />;
  else if (path === "/about") page = <AboutPage />;
  else if (path === "/privacy") page = <PrivacyPage />;
  else if (path === "/terms") page = <TermsPage />;
  else if (path === "/disclaimer") page = <DisclaimerPage />;
  else if (path === "/contact") page = <ContactPage />;

  return (
    <TooltipProvider>
      <Suspense fallback={<RouteFallback />}>{page}</Suspense>
      <Toaster />
    </TooltipProvider>
  );
}
