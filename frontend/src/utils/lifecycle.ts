// Pure helper for the claim progress tracker (presentation logic, tested).
// The real workflow rules live in the backend; this only decides how to *draw*
// the member-facing progress bar.

export type StepState = "done" | "current" | "todo" | "failed";

export interface TrackerStep {
  label: string;
  state: StepState;
}

// The happy-path stages a member sees.
const MAIN_STAGES = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "DOCUMENTS_VERIFIED", label: "Docs verified" },
  { key: "UNDER_ASSESSMENT", label: "Assessment" },
  { key: "APPROVED", label: "Approved" },
  { key: "PAYMENT_INITIATED", label: "Payment" },
  { key: "CLOSED", label: "Closed" },
] as const;

// Where each real status sits on that happy path.
const STAGE_INDEX: Record<string, number> = {
  SUBMITTED: 0,
  DOCUMENTS_VERIFIED: 1,
  PENDING_INFO: 1, // looped back to the docs stage
  UNDER_ASSESSMENT: 2,
  APPROVED: 3,
  REJECTED: 2, // ended at the assessment stage
  PAYMENT_INITIATED: 4,
  CLOSED: 5,
};

export function buildTracker(status: string): TrackerStep[] {
  const current = STAGE_INDEX[status] ?? 0;
  const rejected = status === "REJECTED";
  const closed = status === "CLOSED";

  return MAIN_STAGES.map((stage, i) => {
    if (closed) return { label: stage.label, state: "done" };
    if (rejected && i === 2) return { label: "Rejected", state: "failed" };
    if (i < current) return { label: stage.label, state: "done" };
    if (i === current) return { label: stage.label, state: "current" };
    return { label: stage.label, state: "todo" };
  });
}
