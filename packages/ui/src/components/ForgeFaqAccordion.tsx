"use client";

import { useId, useState } from "react";

export type ForgeFaqItem = {
  id: string;
  question: string;
  answer: string;
};

type ForgeFaqAccordionProps = {
  items: ForgeFaqItem[];
  allowMultiple?: boolean;
};

export function ForgeFaqAccordion({ items, allowMultiple = false }: ForgeFaqAccordionProps) {
  const baseId = useId();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(allowMultiple ? current : []);
      if (current.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {items.map((item) => {
        const open = openIds.has(item.id);
        const panelId = `${baseId}-${item.id}`;
        return (
          <div
            key={item.id}
            className="forge-panel forge-reactive"
            data-forge-proximity="true"
            style={{ borderRadius: "10px", overflow: "hidden" }}
          >
            <button
              type="button"
              className="forge-timeline-toggle"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
              style={{ padding: "0.85rem 1rem" }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", width: "100%" }}>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.question}</span>
                <span className="forge-mono" style={{ color: "var(--forge-accent)", fontSize: "0.7rem" }}>
                  {open ? "−" : "+"}
                </span>
              </span>
            </button>
            {open ? (
              <div id={panelId} role="region" className="forge-faq-answer" style={{ padding: "0 1rem 1rem" }}>
                <p style={{ margin: 0, color: "var(--forge-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>{item.answer}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
