import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Logo";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { SiteFooter } from "@/components/SiteFooter";
import { hideBootSplash } from "@/lib/boot";
import { useAuth } from "@/store/auth";

/** Blocks the notes app until Google Auth succeeds (and profile is set). */
export function AuthGate({ children }: { children: ReactNode }) {
  const ready = useAuth((state) => state.ready);
  const user = useAuth((state) => state.user);
  const profile = useAuth((state) => state.profile);
  const profileReady = useAuth((state) => state.profileReady);
  const signInWithGoogle = useAuth((state) => state.signInWithGoogle);

  const [signingIn, setSigningIn] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [profileTimedOut, setProfileTimedOut] = useState(false);

  useEffect(() => {
    if (ready) hideBootSplash();
  }, [ready]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAuth.getState().ready) setAuthTimedOut(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user && !profileReady) {
      const timer = setTimeout(() => {
        if (!useAuth.getState().profileReady) setProfileTimedOut(true);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [user, profileReady]);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sign-in could not be completed";
      if (!msg.includes("popup-closed-by-user") && !msg.includes("cancelled-popup-request")) {
        toast.error("Could not sign in with Google", { description: msg });
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-canvas p-6 text-center">
        <img
          src="/noteseen-mark.png?v=2"
          alt=""
          className="size-12 object-contain"
          width={48}
          height={48}
        />
        {authTimedOut && (
          <div className="mt-4 max-w-sm rounded-lg border border-hairline bg-surface p-4 text-xs text-body-muted">
            <p className="font-semibold text-ink mb-1">Connecting to authentication…</p>
            <p>If you are offline or have an ad-blocker blocking Google Auth, try reloading.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col bg-canvas text-ink">
        <header className="flex items-center justify-between px-5 py-5 sm:px-10">
          <Wordmark />
        </header>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 pb-16">
          <h1 className="ns-display text-ink">Sign in to continue</h1>
          <p className="ns-caption mt-3 text-body-muted">
            NoteSeen needs Google sign-in so your notes sync safely and stay private to your
            account.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-8 w-full sm:w-auto"
            disabled={signingIn}
            onClick={() => void handleSignIn()}
          >
            {signingIn ? "Connecting with Google…" : "Continue with Google"}
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!profileReady) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-canvas p-6 text-center">
        <span className="ns-mono text-muted">Loading profile…</span>
        {profileTimedOut && (
          <div className="mt-4 max-w-sm rounded-lg border border-hairline bg-surface p-4 text-xs text-body-muted">
            <p className="font-semibold text-ink mb-1">Slow connection?</p>
            <p>Could not fetch cloud profile. You can retry or continue.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <OnboardingDialog />
      {profile ? (
        children
      ) : (
        <div className="flex h-full items-center justify-center bg-canvas px-5">
          <span className="ns-mono text-center text-muted">
            Finish profile setup to open your notes
          </span>
        </div>
      )}
    </>
  );
}
