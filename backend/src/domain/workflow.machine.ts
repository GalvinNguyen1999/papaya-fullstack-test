// DOMAIN (Challenge 14) — claim lifecycle state machine. Config-driven:
// adding a state/transition is data, not code. Pure validation logic; the
// service layer handles persistence + audit.

import type { ClaimStatus, Role, TransitionDef } from "./types";

export const TRANSITIONS: TransitionDef[] = [
  { from: "SUBMITTED", to: "DOCUMENTS_VERIFIED", roles: ["document_clerk"], requires: ["all_documents_present"], sideEffects: ["notify_assessor_team"] },
  { from: "DOCUMENTS_VERIFIED", to: "UNDER_ASSESSMENT", roles: ["team_lead", "assessor"], requires: ["assessor_assigned"], sideEffects: ["log_assessment_start"] },
  { from: "UNDER_ASSESSMENT", to: "APPROVED", roles: ["assessor"], requires: ["assessment_complete", "within_limit"], sideEffects: ["notify_member", "create_payment_request"] },
  { from: "UNDER_ASSESSMENT", to: "REJECTED", roles: ["assessor"], requires: ["assessment_complete", "rejection_reason"], sideEffects: ["notify_member_rejection"] },
  { from: "UNDER_ASSESSMENT", to: "PENDING_INFO", roles: ["assessor"], requires: ["missing_info_description"], sideEffects: ["notify_member_request"] },
  { from: "PENDING_INFO", to: "DOCUMENTS_VERIFIED", roles: ["document_clerk"], requires: ["new_info_received"], sideEffects: ["reset_assessment_timer"] },
  { from: "APPROVED", to: "PAYMENT_INITIATED", roles: ["finance"], requires: ["payment_request_created"], sideEffects: ["trigger_payment"] },
  { from: "PAYMENT_INITIATED", to: "CLOSED", roles: ["finance"], requires: ["payment_confirmed"], sideEffects: ["notify_member_payment"] },
  { from: "REJECTED", to: "CLOSED", roles: ["system", "assessor"], requires: ["appeal_period_over"], sideEffects: ["archive_claim"] },
];

export const MAX_INFO_CYCLES = 3;

// ── One-click decision (for the simple assessor UI) ──────────────────
// A non-technical user only makes a decision (approve / reject / request
// info / pay); the system walks the underlying states for them.

export type Decision = "APPROVE" | "REJECT" | "REQUEST_INFO" | "PAY" | "CLOSE";

const ROUTE_TO_ASSESSMENT: Partial<Record<ClaimStatus, ClaimStatus[]>> = {
  SUBMITTED: ["DOCUMENTS_VERIFIED", "UNDER_ASSESSMENT"],
  DOCUMENTS_VERIFIED: ["UNDER_ASSESSMENT"],
  PENDING_INFO: ["DOCUMENTS_VERIFIED", "UNDER_ASSESSMENT"],
  UNDER_ASSESSMENT: [],
};

const DECISION_TARGET: Record<"APPROVE" | "REJECT" | "REQUEST_INFO", ClaimStatus> = {
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  REQUEST_INFO: "PENDING_INFO",
};

/** The ordered list of states to walk to carry out a decision from `from`.
 *  Empty array = the decision is not valid from the current state. */
export function pathFor(from: ClaimStatus, decision: Decision): ClaimStatus[] {
  if (decision === "PAY") return from === "APPROVED" ? ["PAYMENT_INITIATED", "CLOSED"] : [];
  if (decision === "CLOSE") return from === "REJECTED" ? ["CLOSED"] : [];

  const prefix = ROUTE_TO_ASSESSMENT[from];
  if (prefix === undefined) return [];

  return [...prefix, DECISION_TARGET[decision]];
}

export interface TransitionContext {
  /** Precondition keys the caller asserts are satisfied. */
  satisfied?: string[];
  /** How many PENDING_INFO cycles this claim already went through. */
  infoCycles?: number;
}

export interface TransitionCheck {
  ok: boolean;
  error?: string;
  def?: TransitionDef;
}

export function availableTransitions(from: ClaimStatus): TransitionDef[] {
  return TRANSITIONS.filter((t) => t.from === from);
}

export function checkTransition(
  from: ClaimStatus,
  to: ClaimStatus,
  role: Role,
  ctx: TransitionContext = {},
): TransitionCheck {
  const def = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!def) {
    const allowed = availableTransitions(from).map((t) => t.to);
    return {
      ok: false,
      error: `Invalid transition ${from} → ${to}. Allowed from ${from}: ${allowed.join(", ") || "(none)"}.`,
    };
  }
  if (!def.roles.includes(role)) {
    return { ok: false, error: `Role "${role}" is not authorized for ${from} → ${to}. Requires: ${def.roles.join(" or ")}.`, def };
  }
  // Cycle guard for the request-info loop.
  if (to === "PENDING_INFO" && (ctx.infoCycles ?? 0) >= MAX_INFO_CYCLES) {
    return { ok: false, error: `Maximum information requests exceeded (${MAX_INFO_CYCLES}) — escalate to team lead.`, def };
  }
  const satisfied = new Set(ctx.satisfied ?? []);
  const missing = (def.requires ?? []).filter((r) => !satisfied.has(r));
  if (missing.length > 0) {
    return { ok: false, error: `Preconditions not met for ${from} → ${to}: ${missing.join(", ")}.`, def };
  }
  return { ok: true, def };
}
