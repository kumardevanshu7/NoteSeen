import type * as React from "react";
import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-xs border border-hairline bg-sunken px-1.5",
        "font-mono text-[11px] font-medium leading-none tracking-wide text-slate shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
