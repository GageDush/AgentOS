"use client";

type ForgeSegmentOption = {
  id: string;
  label: string;
};

type ForgeSegmentedControlProps = {
  options: ForgeSegmentOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
};

export function ForgeSegmentedControl({ options, value, onChange, ariaLabel = "View mode" }: ForgeSegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        gap: "0.25rem",
        padding: "0.2rem",
        borderRadius: "10px",
        border: "1px solid var(--forge-border)",
        background: "rgba(0, 0, 0, 0.25)"
      }}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`forge-btn forge-magnetic ${active ? "forge-btn-primary" : ""}`}
            data-forge-proximity="true"
            style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
