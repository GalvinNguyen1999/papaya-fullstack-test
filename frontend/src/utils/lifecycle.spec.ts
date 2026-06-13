import { describe, it, expect } from "vitest";
import { buildTracker } from "./lifecycle";

describe("buildTracker", () => {
  it("marks the current stage and everything before it as done", () => {
    const steps = buildTracker("UNDER_ASSESSMENT");
    expect(steps[0].state).toBe("done"); // Submitted
    expect(steps[1].state).toBe("done"); // Docs verified
    expect(steps[2].state).toBe("current"); // Assessment
    expect(steps[3].state).toBe("todo"); // Approved
  });

  it("shows a failed step for rejected claims", () => {
    const steps = buildTracker("REJECTED");
    expect(steps[2]).toEqual({ label: "Rejected", state: "failed" });
  });

  it("treats PENDING_INFO as back at the docs stage", () => {
    const steps = buildTracker("PENDING_INFO");
    expect(steps[1].state).toBe("current");
  });

  it("marks all stages done when closed", () => {
    const steps = buildTracker("CLOSED");
    expect(steps.every((s) => s.state === "done")).toBe(true);
  });
});
