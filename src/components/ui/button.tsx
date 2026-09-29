import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-normal sm:whitespace-nowrap text-center font-medium transition-[background-color,color,border-color,opacity] duration-150 outline-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ring-offset-canvas " +
  "disabled:cursor-not-allowed disabled:opacity-40 " +
  "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-ink hover:bg-primary/88 rounded-full",
        outline: "border border-hairline text-ink hover:bg-stone rounded-md bg-transparent",
        ghost: "text-ink hover:bg-stone rounded-md bg-transparent",
        soft: "bg-stone text-ink hover:bg-stone/70 rounded-md",
        link: "text-ink underline underline-offset-4 decoration-hairline hover:decoration-ink rounded-xs",
        danger:
          "bg-error/10 text-error border border-error/30 hover:bg-error hover:text-white rounded-md focus-visible:ring-error",
      },
      size: {
        sm: "h-8.5 sm:h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-9.5 sm:size-9 min-h-[36px] min-w-[36px] rounded-full p-0",
        "icon-sm": "size-8.5 sm:size-8 min-h-[34px] min-w-[34px] rounded-full p-0",
        inline: "h-auto p-0",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...(!asChild ? { type: type ?? "button" } : {})}
      {...props}
    />
  );
}

export { Button, buttonVariants };
