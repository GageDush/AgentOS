import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";

afterEach(() => cleanup());

describe("CommandPalette", () => {
  it("renders when open and executes command on Enter", () => {
    const onExecute = vi.fn();
    render(
      <CommandPalette
        open
        commands={[{ id: "test", label: "/open approvals", category: "slash" }]}
        onExecute={onExecute}
      />
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onExecute).toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        commands={[{ id: "test", label: "Test", category: "suggested" }]}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
