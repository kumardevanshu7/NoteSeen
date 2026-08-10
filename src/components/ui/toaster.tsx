import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      offset={20}
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-sm !border !border-hairline !bg-surface !text-ink !font-sans !text-[13px] !shadow-[0_18px_50px_-30px_rgb(0_0_0/0.4)]",
          title: "!text-ink !font-medium",
          description: "!text-body-muted",
          actionButton: "!bg-primary !text-primary-ink !rounded-full !text-[12px]",
          cancelButton: "!bg-stone !text-ink !rounded-full !text-[12px]",
        },
      }}
    />
  );
}
