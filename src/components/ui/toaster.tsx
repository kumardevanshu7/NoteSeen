import { Toaster as Sonner } from "sonner";
import { useAppearance } from "@/hooks/use-appearance";

export function Toaster() {
  const isDark = useAppearance((state) => state.isDark);

  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      position="bottom-right"
      closeButton
      offset={24}
      gap={10}
      className="max-md:!bottom-20"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "rounded-md border border-hairline bg-surface text-ink font-sans text-[13px] shadow-[0_18px_50px_-30px_rgb(0_0_0/0.4)]",
          title: "text-ink font-medium",
          description: "text-body-muted text-xs leading-normal",
          actionButton: "bg-primary text-primary-ink rounded-full text-xs font-medium px-3 py-1",
          cancelButton: "bg-stone text-ink rounded-full text-xs font-medium px-3 py-1",
          closeButton: "border border-hairline bg-surface text-slate hover:bg-stone hover:text-ink",
          error: "border-error/40 bg-surface text-ink",
        },
      }}
    />
  );
}
