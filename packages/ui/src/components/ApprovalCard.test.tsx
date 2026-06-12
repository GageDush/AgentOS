import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApprovalCard } from "./ApprovalCard";

afterEach(() => cleanup());

describe("ApprovalCard", () => {
  it("renders approval actions and calls handlers", () => {
    const onAllowOnce = vi.fn();
    const onDeny = vi.fn();

    render(
      <ApprovalCard
        approval={{
          id: "a1",
          requestingAgent: "implementer",
          requestedAction: "pnpm typecheck",
          riskLevel: "safe_execute"
        }}
        onAllowOnce={onAllowOnce}
        onDeny={onDeny}
      />
    );

    fireEvent.click(screen.getByText("Allow Once"));
    fireEvent.click(screen.getByText("Deny"));

    expect(onAllowOnce).toHaveBeenCalledWith("a1");
    expect(onDeny).toHaveBeenCalledWith("a1");
  });
});
