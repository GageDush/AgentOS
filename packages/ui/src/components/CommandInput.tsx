"use client";

import { type FormEvent, useState } from "react";

type CommandInputProps = {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  prefix?: string;
  disabled?: boolean;
};

export function CommandInput({
  placeholder = "Enter command…",
  onSubmit,
  prefix = ">",
  disabled = false
}: CommandInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit?.(value.trim());
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <span className="forge-mono" style={{ color: "var(--forge-accent)" }}>
        {prefix}
      </span>
      <input
        className="forge-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Command input"
      />
    </form>
  );
}
