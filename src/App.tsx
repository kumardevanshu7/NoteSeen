import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { LandingPage } from "@/components/LandingPage";
import { useAppDeepLinkRedirect, usePath } from "@/lib/nav";
import { useAuth } from "@/store/auth";
import { AboutPage } from "@/pages/AboutPage";
import { ContactPage } from "@/pages/ContactPage";
import { DisclaimerPage } from "@/pages/DisclaimerPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";

export default function App() {
  const path = usePath();
  const initAuth = useAuth((state) => state.initAuth);
  useAppDeepLinkRedirect();

  useEffect(() => initAuth(), [initAuth]);

  let page = <LandingPage />;
  if (path === "/app" || path.startsWith("/app/")) {
    page = (
      <AuthGate>
        <AppShell />
      </AuthGate>
    );
  } else if (path === "/explore") page = <ExplorePage />;
  else if (path === "/about") page = <AboutPage />;
  else if (path === "/privacy") page = <PrivacyPage />;
  else if (path === "/terms") page = <TermsPage />;
  else if (path === "/disclaimer") page = <DisclaimerPage />;
  else if (path === "/contact") page = <ContactPage />;

  return (
    <TooltipProvider>
      {page}
      <Toaster />
    </TooltipProvider>
  );
}
