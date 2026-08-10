import { cn } from "@/lib/utils";
import { navigate } from "@/lib/nav";

/** Bump when replacing logo PNGs so SW/browser drop the old black-box assets. */
const MARK_V = "v2";

/** Transparent NoteSeen glyph — no baked black square. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={`/noteseen-mark.png?${MARK_V}`}
      alt=""
      width={20}
      height={20}
      className={cn("size-5 shrink-0 object-contain", className)}
      draggable={false}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => navigate("/")}
      className={cn("flex items-center gap-2", className)}
      aria-label="NoteSeen home"
    >
      <LogoMark />
      <span className="font-display text-[17px] leading-none tracking-[-0.02em] text-ink">
        NoteSeen
      </span>
    </button>
  );
}

/** Transparent Arigato mark — no baked black square. */
export function ArigatoMark({ className, size = 17 }: { className?: string; size?: number }) {
  return (
    <img
      src={`/arigato-mark.png?${MARK_V}`}
      alt="Arigato Labs"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
