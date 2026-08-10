import { cn } from "@/lib/utils";
import { navigate } from "@/lib/nav";

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/favicon-32x32.png"
      alt=""
      width={20}
      height={20}
      className={cn("size-5 rounded-[4px] object-contain", className)}
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

export function ArigatoMark({ className, size = 17 }: { className?: string; size?: number }) {
  return (
    <img
      src="/arigato-single-logo.png"
      alt="Arigato Labs"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
