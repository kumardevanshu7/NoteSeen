import { cn } from "@/lib/utils";
import { navigate } from "@/lib/nav";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-black",
        className,
      )}
    >
      <img
        src="/favicon-32x32.png"
        alt=""
        width={16}
        height={16}
        className="size-4 object-contain"
        draggable={false}
      />
    </span>
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

export function ArigatoMark({ className, size = 17 }: { className?: string; size?: number }) {
  const box = Math.max(size, 14);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-black",
        className,
      )}
      style={{ width: box, height: box }}
    >
      <img
        src="/arigato-mark.png"
        alt="Arigato Labs"
        width={Math.round(box * 0.78)}
        height={Math.round(box * 0.78)}
        className="object-contain"
        style={{ width: Math.round(box * 0.78), height: Math.round(box * 0.78) }}
        draggable={false}
      />
    </span>
  );
}
