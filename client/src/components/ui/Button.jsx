import React from "react";
import { cn } from "../../lib/utils";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent",
  secondary: "bg-secondary text-secondary-foreground hover:bg-muted border border-border",
  outline: "border border-input bg-background text-foreground hover:bg-accent",
  ghost: "bg-transparent text-foreground hover:bg-accent",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
};

const sizes = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3 text-xs font-medium gap-2",
  lg: "h-10 px-4 text-sm font-medium gap-2"
};

export const Button = React.forwardRef(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = "Button";
