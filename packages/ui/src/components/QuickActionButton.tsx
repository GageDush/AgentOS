"use client";

import { MagneticButton } from "../motion/MagneticButton";

type QuickActionButtonProps = {
  label: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
  importance?: "primary" | "secondary" | "default";
};

export function QuickActionButton({
  label,
  description,
  onClick,
  disabled,
  importance = "default"
}: QuickActionButtonProps) {
  const variant = importance === "primary" ? "primary" : "default";
  const size = importance === "primary" ? "lg" : importance === "secondary" ? "md" : "sm";

  return (
    <MagneticButton
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className="forge-quick-action"
    >
      <span className="forge-quick-action-label">{label}</span>
      {description ? <span className="forge-quick-action-desc">{description}</span> : null}
    </MagneticButton>
  );
}
