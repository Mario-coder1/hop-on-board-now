import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_6px_18px_-6px_hsl(var(--primary)/0.5)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-border bg-background hover:bg-muted hover:border-primary/30",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline rounded-md",
        hero: "bg-gradient-to-r from-primary to-[hsl(190_82%_48%)] text-primary-foreground hover:opacity-95 shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.55)] hover:shadow-[0_16px_40px_-10px_hsl(var(--primary)/0.65)]",
        success: "bg-[hsl(152_69%_45%)] text-white hover:bg-[hsl(152_69%_42%)] shadow-[0_6px_18px_-6px_hsl(152_69%_45%/0.5)]",
        glass: "glass-strong text-foreground hover:bg-white/90",
        coral: "bg-gradient-to-r from-accent to-[hsl(20_92%_60%)] text-accent-foreground hover:opacity-95 shadow-[var(--shadow-cta)]",
        bento: "bg-card text-foreground border border-border hover:border-primary/40 hover:bg-muted",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-xl px-3.5",
        lg: "h-14 rounded-2xl px-8 text-base",
        xl: "h-16 rounded-3xl px-10 text-base",
        icon: "h-11 w-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
