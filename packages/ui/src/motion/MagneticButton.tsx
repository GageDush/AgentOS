"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { AnimatedStripeOverlay } from "./AnimatedStripeOverlay";

type MagneticButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
};

export function MagneticButton({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}: MagneticButtonProps) {
  const variantClass =
    variant === "primary" ? "forge-btn-primary" : variant === "danger" ? "forge-btn-danger" : "";
  const sizeClass = size === "lg" ? "forge-btn-lg" : size === "sm" ? "forge-btn-sm" : "";

  return (
    <button
      type="button"
      className={`forge-btn forge-magnetic forge-reactive ${variantClass} ${sizeClass} ${className}`.trim()}
      data-forge-proximity="true"
      {...props}
    >
      <AnimatedStripeOverlay />
      {children}
    </button>
  );
}
