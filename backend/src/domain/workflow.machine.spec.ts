import { checkTransition, availableTransitions, MAX_INFO_CYCLES, pathFor } from "./workflow.machine";

describe("pathFor (one-click decision)", () => {
  it("walks SUBMITTED → … → APPROVED for an approve decision", () => {
    expect(pathFor("SUBMITTED", "APPROVE")).toEqual(["DOCUMENTS_VERIFIED", "UNDER_ASSESSMENT", "APPROVED"]);
  });

  it("goes straight to the target when already under assessment", () => {
    expect(pathFor("UNDER_ASSESSMENT", "REJECT")).toEqual(["REJECTED"]);
  });

  it("re-routes from PENDING_INFO back through assessment", () => {
    expect(pathFor("PENDING_INFO", "APPROVE")).toEqual(["DOCUMENTS_VERIFIED", "UNDER_ASSESSMENT", "APPROVED"]);
  });

  it("pays and closes from APPROVED", () => {
    expect(pathFor("APPROVED", "PAY")).toEqual(["PAYMENT_INITIATED", "CLOSED"]);
  });

  it("returns empty for an impossible decision", () => {
    expect(pathFor("CLOSED", "APPROVE")).toEqual([]);
    expect(pathFor("SUBMITTED", "PAY")).toEqual([]);
  });
});

describe("workflow state machine", () => {
  it("allows the happy-path transition with right role + preconditions", () => {
    const r = checkTransition("SUBMITTED", "DOCUMENTS_VERIFIED", "document_clerk", { satisfied: ["all_documents_present"] });
    expect(r.ok).toBe(true);
  });

  it("rejects an invalid transition with a specific message", () => {
    const r = checkTransition("SUBMITTED", "APPROVED", "assessor");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Invalid transition SUBMITTED → APPROVED/);
  });

  it("rejects an unauthorized role", () => {
    const r = checkTransition("UNDER_ASSESSMENT", "APPROVED", "document_clerk", { satisfied: ["assessment_complete", "within_limit"] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not authorized/);
  });

  it("rejects when preconditions are missing", () => {
    const r = checkTransition("UNDER_ASSESSMENT", "APPROVED", "assessor", { satisfied: ["assessment_complete"] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/within_limit/);
  });

  it("blocks PENDING_INFO after the cycle limit", () => {
    const r = checkTransition("UNDER_ASSESSMENT", "PENDING_INFO", "assessor", {
      satisfied: ["missing_info_description"],
      infoCycles: MAX_INFO_CYCLES,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Maximum information requests/);
  });

  it("lists available transitions from a state", () => {
    const tos = availableTransitions("UNDER_ASSESSMENT").map((t) => t.to);
    expect(tos).toEqual(expect.arrayContaining(["APPROVED", "REJECTED", "PENDING_INFO"]));
  });
});
