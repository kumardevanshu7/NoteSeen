import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Logo";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/store/auth";

/** Blocks the notes app until Google Auth succeeds (and profile is set). */
export function AuthGate({ children }: { children: ReactNode }) {
  const ready = useAuth((state) => state.ready);
  const user = useAuth((state) => state.user);
  const profile = useAuth((state) => state.profile);
  const profileReady = useAuth((state) => state.profileReady);
  const signInWithGoogle = useAuth((state) => state.signInWithGoogle);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <span className="ns-mono text-muted">Checking sign-in…</span>
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
            onClick={() => void signInWithGoogle()}
          >
            Continue with Google
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!profileReady) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <span className="ns-mono text-muted">Loading profile…</span>
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
