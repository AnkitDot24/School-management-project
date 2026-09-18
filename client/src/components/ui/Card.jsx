import React from "react";
import { cn } from "../../lib/utils";

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-soft", className)} {...props} />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1 border-b border-border/40 p-4", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-sm font-semibold leading-tight tracking-tight text-foreground", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props} />
));
CardContent.displayName = "CardContent";
