"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { AnimatedStripeOverlay } from "./AnimatedStripeOverlay";

type MagneticButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "primary" | "danger";
};

export function MagneticButton({
  children,
  variant = "default",
  className = "",
  ...props
}: MagneticButtonProps) {
  const variantClass =
    variant === "primary" ? "forge-btn-primary" : variant === "danger" ? "forge-btn-danger" : "";

  return (
    <button
      type="button"
      className={`forge-btn forge-magnetic forge-reactive ${variantClass} ${className}`.trim()}
      data-forge-proximity="true"
      {...props}
    >
      <AnimatedStripeOverlay />
      {children}
    </button>
  );
}
