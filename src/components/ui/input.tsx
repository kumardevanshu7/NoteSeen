import type * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full rounded-md border border-hairline bg-surface px-3 text-base text-ink transition-colors outline-none md:text-sm",
        "placeholder:text-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/35 focus-visible:outline-none",
        "aria-invalid:border-error aria-invalid:focus-visible:border-error aria-invalid:focus-visible:ring-error/30",
        "aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:border-error aria-[invalid=true]:focus-visible:ring-error/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
