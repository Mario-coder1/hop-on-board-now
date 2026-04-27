import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-tight ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground hover:shadow-[0_16px_36px_-8px_hsla(222_89%_55%_/_0.55)] shadow-cta",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
        outline: "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 shadow-sm",
        secondary: "bg-muted text-foreground hover:bg-muted/70",
        ghost: "text-foreground hover:bg-primary/5 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline rounded-md",
        hero: "bg-gradient-to-br from-primary via-[hsl(var(--primary-glow))] to-accent text-primary-foreground shadow-cta hover:shadow-[0_20px_44px_-8px_hsla(222_89%_55%_/_0.6)]",
        success: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:opacity-90 shadow-md",
        glass: "glass text-foreground hover:border-primary/40",
        coral: "bg-gradient-to-br from-accent to-[hsl(190_95%_60%)] text-accent-foreground hover:opacity-95 shadow-md",
        bento: "bg-card text-foreground border border-border hover:border-primary/40 shadow-sm",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-7 text-base",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10 rounded-full",
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
