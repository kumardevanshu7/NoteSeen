import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Logo";
import { navigate } from "@/lib/nav";
import { useAuth } from "@/store/auth";
import { SiteFooter } from "@/components/SiteFooter";

export function LandingPage() {
  const user = useAuth((state) => state.user);
  const ready = useAuth((state) => state.ready);
  const signInWithGoogle = useAuth((state) => state.signInWithGoogle);

  useEffect(() => {
    if (ready && user) navigate("/app");
  }, [ready, user]);

  const signIn = () => {
    void signInWithGoogle().then(() => {
      if (useAuth.getState().user) navigate("/app");
    });
  };

  return (
    <div className="ns-landing relative min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <div className="ns-landing-glow" aria-hidden />

      <header className="ns-landing-nav relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <Wordmark />
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={signIn}
          disabled={!ready}
        >
          Sign in
        </Button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pb-16 pt-6 sm:px-10 sm:pt-10">
        <section className="max-w-xl">
          <h1 className="ns-landing-rise ns-landing-rise-1 font-display text-[clamp(3.25rem,11vw,6.5rem)] leading-[0.92] tracking-[-0.04em] text-ink">
            NoteSeen
          </h1>
          <p className="ns-landing-rise ns-landing-rise-2 ns-body-lg mt-5 text-body-muted">
            Open. Type. Close — already saved. Sign in with Google to use your notes across devices.
          </p>
          <div className="ns-landing-rise ns-landing-rise-3 mt-8 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" onClick={signIn} disabled={!ready}>
              Continue with Google
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="ns-caption mt-4 text-muted">Notes stay locked until you sign in.</p>
        </section>

        <section className="ns-landing-paper w-full" aria-hidden>
          <div className="ns-landing-paper-inner">
            <p className="font-display text-[clamp(1.35rem,3vw,1.85rem)] tracking-[-0.02em] text-ink">
              The New Beginning
            </p>
            <p className="ns-mono mt-3 text-muted">Just now · saved</p>
            <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-body-muted">
              <p>Start typing. Walk away. NoteSeen already wrote it down.</p>
              <p className="text-ink">Introduction</p>
              <p>
                A notepad that does not ask you to remember to save — and keeps every note as a
                portable file when you want it.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
