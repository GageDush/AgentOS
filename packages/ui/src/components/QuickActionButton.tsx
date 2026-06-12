"use client";

import { MagneticButton } from "../motion/MagneticButton";

type QuickActionButtonProps = {
  label: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function QuickActionButton({ label, description, onClick, disabled }: QuickActionButtonProps) {
  return (
    <MagneticButton onClick={onClick} disabled={disabled} style={{ width: "100%", textAlign: "left", flexDirection: "column", alignItems: "flex-start" }}>
      <span className="forge-mono" style={{ color: "var(--forge-accent)" }}>
        {label}
      </span>
      {description ? <span style={{ fontSize: "0.75rem", color: "var(--forge-muted)" }}>{description}</span> : null}
    </MagneticButton>
  );
}
