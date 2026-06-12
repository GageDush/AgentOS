import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MissionTimeline } from "./MissionTimeline";

afterEach(() => cleanup());

describe("MissionTimeline", () => {
  it("renders mission step states", () => {
    render(
      <MissionTimeline
        steps={[
          { id: "1", kind: "queued", label: "Queued", status: "complete" },
          { id: "2", kind: "planning", label: "Planning", status: "active" }
        ]}
      />
    );

    expect(screen.getByText("Queued")).toBeTruthy();
    expect(screen.getAllByText("Planning").length).toBeGreaterThan(0);
    expect(screen.getByText("active")).toBeTruthy();
  });
});
