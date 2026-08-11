import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, Lock, Shield, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { navigate } from "@/lib/nav";
import { hideBootSplash } from "@/lib/boot";
import { cn } from "@/lib/utils";

const TYPE_LINES = [
  "Secret Vault encrypts on your device — not in the cloud.",
  "AES-GCM turns API keys into gibberish before Firestore sees them.",
  "Your 4-digit PIN becomes an AES-256 key via PBKDF2.",
  "Even if someone opens the database, they only see ciphertext.",
  "Decrypt happens locally, only after you unlock.",
];

const FLOW = [
  {
    step: "01",
    title: "You type a secret",
    body: "API key or password stays in the browser.",
    icon: KeyRound,
  },
  {
    step: "02",
    title: "PIN unlocks the vault",
    body: "A short code you set — never stored in plain digits.",
    icon: Lock,
  },
  {
    step: "03",
    title: "PBKDF2 stretches the PIN",
    body: "120,000 rounds turn a tiny PIN into a strong key.",
    icon: Sparkles,
  },
  {
    step: "04",
    title: "AES-GCM encrypts",
    body: "Ciphertext + integrity check. Tampering breaks decrypt.",
    icon: Shield,
  },
  {
    step: "05",
    title: "Gibberish hits the cloud",
    body: "Firestore only stores valueCipher — not the real secret.",
    icon: Upload,
  },
  {
    step: "06",
    title: "Only you can read it",
    body: "Unlock with your PIN. Idle lock kicks in after a minute.",
    icon: Lock,
  },
] as const;

function TypingTechLine() {
  const [lineIndex, setLineIndex] = useState(0);
  const [shown, setShown] = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "erasing">("typing");

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(TYPE_LINES[0]);
      return;
    }

    const full = TYPE_LINES[lineIndex];

    if (phase === "typing") {
      if (shown.length < full.length) {
        const timer = window.setTimeout(() => setShown(full.slice(0, shown.length + 1)), 28);
        return () => window.clearTimeout(timer);
      }
      const timer = window.setTimeout(() => setPhase("hold"), 1600);
      return () => window.clearTimeout(timer);
    }

    if (phase === "hold") {
      const timer = window.setTimeout(() => setPhase("erasing"), 400);
      return () => window.clearTimeout(timer);
    }

    if (shown.length > 0) {
      const timer = window.setTimeout(() => setShown(shown.slice(0, -1)), 14);
      return () => window.clearTimeout(timer);
    }

    setLineIndex((index) => (index + 1) % TYPE_LINES.length);
    setPhase("typing");
  }, [shown, phase, lineIndex]);

  return (
    <p className="ns-landing-type min-h-[4.5rem] font-mono text-[15px] leading-relaxed text-ink sm:min-h-[3.25rem] sm:text-[17px]">
      <span className="text-muted">&gt; </span>
      {shown}
      <span className="ns-landing-caret" aria-hidden>
        ▍
      </span>
    </p>
  );
}

/**
 * Landing paints first without waiting on Firebase.
 * Auth boots in the background so returning users jump to /app.
 */
export function LandingPage() {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hideBootSplash();
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    void import("@/store/auth")
      .then(({ useAuth }) => {
        if (cancelled) return;
        unsub = useAuth.getState().initAuth();
        const check = () => {
          const { ready, user } = useAuth.getState();
          if (ready && user) navigate("/app");
        };
        check();
        return useAuth.subscribe(check);
      })
      .then((stop) => {
        if (cancelled) {
          stop?.();
          return;
        }
        const prev = unsub;
        unsub = () => {
          prev?.();
          stop?.();
        };
      });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const signIn = async () => {
    setBusy(true);
    try {
      const { useAuth } = await import("@/store/auth");
      if (!useAuth.getState().ready) useAuth.getState().initAuth();
      await useAuth.getState().signInWithGoogle();
      if (useAuth.getState().user) navigate("/app");
    } finally {
      setBusy(false);
    }
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
          onClick={() => void signIn()}
          disabled={busy}
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
            <Button variant="primary" size="lg" onClick={() => void signIn()} disabled={busy}>
              {busy ? "Opening Google…" : "Continue with Google"}
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

        <section className="ns-landing-tech w-full border-t border-hairline pt-12">
          <p className="ns-mono text-muted">Secret Vault</p>
          <h2 className="ns-feature mt-3 max-w-2xl text-ink">
            Your keys leave the browser already encrypted
          </h2>
          <div className="mt-6 rounded-sm border border-hairline bg-surface/80 px-4 py-5 sm:px-6">
            <TypingTechLine />
            <p className="ns-caption mt-4 max-w-2xl text-body-muted">
              AES-GCM + PBKDF2 on-device. Firestore only ever sees ciphertext — open the console and
              you get gibberish, not <span className="font-mono text-ink">sk-…</span>.
            </p>
          </div>
        </section>

        <section className="ns-landing-flow w-full border-t border-hairline pt-12 pb-4">
          <p className="ns-mono text-muted">How encryption works</p>
          <h2 className="ns-feature mt-3 text-ink">From your fingers to gibberish in the cloud</h2>
          <p className="ns-caption mt-2 max-w-xl text-body-muted">
            Six quiet steps. No drama — just cryptography that keeps secrets yours.
          </p>

          <ol className="ns-landing-flow-track mt-10">
            {FLOW.map((item, index) => (
              <li key={item.step} className="ns-landing-flow-step">
                <div className="ns-landing-flow-node">
                  <item.icon className="size-4" />
                </div>
                {index < FLOW.length - 1 ? <span className="ns-landing-flow-line" aria-hidden /> : null}
                <p className="ns-mono mt-4 text-muted">{item.step}</p>
                <p className="mt-1.5 text-[14px] font-medium text-ink">{item.title}</p>
                <p className="ns-caption mt-1.5 text-body-muted">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 overflow-hidden rounded-sm border border-dashed border-hairline bg-stone/40 px-4 py-4 font-mono text-[12px] leading-relaxed text-muted sm:px-5">
            <p className="text-slate">// what Firestore stores</p>
            <p className="mt-1 break-all text-ink">
              valueCipher:{" "}
              <span className={cn("text-body-muted")}>
                a7f3c91e0b2d…8e44 (AES-GCM ciphertext)
              </span>
            </p>
            <p className="mt-1 break-all text-ink">
              valueIv: <span className="text-body-muted">9c1a…f02b (random per secret)</span>
            </p>
            <p className="mt-2 text-slate">// what you typed never appears here</p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
