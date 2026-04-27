import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary to-[hsl(245_85%_65%)] text-primary-foreground hover:opacity-95 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_4px_12px_-4px_hsl(var(--destructive)/0.4)]",
        outline: "border border-border bg-white/60 backdrop-blur-md hover:bg-white hover:border-primary/40",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-white/60 hover:backdrop-blur-md hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline rounded-md",
        hero: "bg-gradient-to-r from-primary via-[hsl(222_89%_60%)] to-accent text-primary-foreground hover:opacity-95 shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.55)]",
        success: "bg-[hsl(152_69%_45%)] text-white hover:bg-[hsl(152_69%_42%)] shadow-[0_4px_12px_-4px_hsl(152_69%_45%/0.4)]",
        glass: "bg-white/70 backdrop-blur-xl border border-white/60 text-foreground hover:bg-white/90 shadow-md",
        coral: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[var(--shadow-cta)]",
        bento: "bg-white/70 backdrop-blur-md text-foreground border border-white/60 hover:border-primary/30 hover:bg-white",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-6 text-base",
        xl: "h-14 rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
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
