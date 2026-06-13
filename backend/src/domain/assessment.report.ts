// DOMAIN (Challenge 11) — builds the structured assessment report from TOOL
// OUTPUTS only. Clause citations are pulled from the policy returned by the
// lookupPolicy tool; nothing is invented. Pure, no framework deps.
//
// buildReport reads as 4 steps: review documents → verify policy → find any
// exclusion → decide the recommendation. Each step is a named helper.

import type {
  Policy,
  DocumentRecord,
  MedicalNecessityResult,
  BenefitCalcResult,
  AssessmentReport,
  PolicyCitation,
  Recommendation,
  BenefitType,
  DocStatus,
} from "./types";

export interface AssessClaim {
  claim_id: string;
  member_name: string;
  claim_type: BenefitType;
  diagnosis: string;
  procedures: string[];
  treatment_start: string;
  treatment_end: string;
  required_documents: string[];
}

const within = (d: string, start: string, end: string): boolean =>
  Date.parse(start) <= Date.parse(d) && Date.parse(d) <= Date.parse(end);

type DocReview = { document_id: string; status: DocStatus; issues: string[] };

/** Collects clause citations, pulling text only from the policy (never invented). */
class Citations {
  private readonly list: PolicyCitation[] = [];

  constructor(private readonly clauses: Record<string, string> = {}) {}

  add(clauseId: string, usedFor: string): void {
    const text = this.clauses[clauseId];
    if (text && !this.list.some((c) => c.clause_id === clauseId)) {
      this.list.push({ clause_id: clauseId, clause_text: text, used_for: usedFor });
    }
  }

  toArray(): PolicyCitation[] {
    return this.list;
  }
}

/* ------------------------------------------------------------------ */
/* STEP 1 — document review                                            */
/* ------------------------------------------------------------------ */

function reviewDocuments(claim: AssessClaim, docResults: DocumentRecord[]): { docReview: DocReview[]; docsOk: boolean } {
  const docReview: DocReview[] = docResults.map((d) => ({ document_id: d.document_id, status: d.status, issues: d.issues }));
  const completeTypes = new Set(docResults.filter((d) => d.status === "complete").map((d) => d.expected_type));

  for (const required of claim.required_documents) {
    const satisfied = completeTypes.has(required);
    const alreadyFlagged = docResults.some((d) => d.expected_type === required && d.status !== "complete");

    if (!satisfied && !alreadyFlagged) {
      docReview.push({ document_id: "(missing)", status: "missing", issues: [`Required document "${required}" was not provided.`] });
    }
  }

  return { docReview, docsOk: claim.required_documents.every((t) => completeTypes.has(t)) };
}

/* ------------------------------------------------------------------ */
/* STEP 2 — policy verification                                        */
/* ------------------------------------------------------------------ */

function verifyPolicy(claim: AssessClaim, policy: Policy) {
  const memberCovered = (policy.members ?? []).includes(claim.member_name);
  const claimTypeIncluded = !!policy.benefits[claim.claim_type];
  const { start, end } = policy.coverage_period;
  const inPeriod = within(claim.treatment_start, start, end) && within(claim.treatment_end, start, end);

  return {
    memberCovered,
    claimTypeIncluded,
    inPeriod,
    notes: [
      `Policy ${policy.policy_id} active: ${policy.active}`,
      `Member "${claim.member_name}" covered: ${memberCovered}`,
      `Claim type ${claim.claim_type} included: ${claimTypeIncluded}`,
      `Treatment ${claim.treatment_start}..${claim.treatment_end} within ${start}..${end}: ${inPeriod}`,
    ],
  };
}

/* ------------------------------------------------------------------ */
/* STEP 3 — exclusion check                                            */
/* ------------------------------------------------------------------ */

function findExclusion(claim: AssessClaim, policy: Policy): string | null {
  const exclusions = (policy.exclusions ?? []).map((e) => e.toLowerCase());

  if (exclusions.includes(claim.diagnosis.toLowerCase())) return claim.diagnosis;

  return claim.procedures.find((p) => exclusions.includes(p.toLowerCase())) ?? null;
}

/* ------------------------------------------------------------------ */
/* STEP 4 — decision (precedence chain)                                */
/* ------------------------------------------------------------------ */

interface DecisionContext {
  claim: AssessClaim;
  policy: Policy;
  verification: ReturnType<typeof verifyPolicy>;
  excludedHit: string | null;
  necessity: MedicalNecessityResult;
  docsOk: boolean;
  docReview: DocReview[];
  benefit: BenefitCalcResult;
}

function decide(ctx: DecisionContext): { recommendation: Recommendation; reasoning: string; citations: PolicyCitation[] } {
  const { claim, policy, verification, excludedHit, necessity, docsOk, docReview, benefit } = ctx;
  const currency = policy.currency ?? "THB";
  const cite = new Citations(policy.clauses);

  // 4a — administrative validity (active, member, benefit, period)
  if (!policy.active || !verification.memberCovered || !verification.claimTypeIncluded || !verification.inPeriod) {
    const why: string[] = [];
    if (!policy.active) why.push("the policy is not active");
    if (!verification.memberCovered) why.push(`${claim.member_name} is not a covered member`);
    if (!verification.claimTypeIncluded) why.push(`${claim.claim_type} is not an included benefit`);
    if (!verification.inPeriod) {
      why.push("the treatment falls outside the coverage period");
      cite.add("COV-PERIOD", "Treatment date is outside the covered period");
    }
    return { recommendation: "REJECT", reasoning: `Rejected because ${why.join("; ")}.`, citations: cite.toArray() };
  }

  // 4b — excluded service or not medically necessary
  if (excludedHit || !necessity.appropriate) {
    if (excludedHit) cite.add("EXCL-1", "Procedure/diagnosis is an excluded service");
    cite.add("COV-PERIOD", "Treatment date confirmed within the covered period");
    const reasoning = excludedHit
      ? `Rejected: "${excludedHit}" is excluded from coverage (clause EXCL-1). Medical necessity: ${necessity.rationale}`
      : `Rejected: not medically necessary — ${necessity.rationale}`;
    return { recommendation: "REJECT", reasoning, citations: cite.toArray() };
  }

  // 4c — documents incomplete → request more info (never reject for paperwork)
  if (!docsOk) {
    cite.add("DOC-REQ", "Required documents are missing or incomplete");
    const problems = docReview
      .filter((d) => d.status !== "complete")
      .map((d) => `${d.document_id} (${d.status}: ${d.issues.join(" ")})`);
    return {
      recommendation: "REQUEST_MORE_INFO",
      reasoning: `The claim is otherwise valid, but assessment cannot complete until documents are corrected: ${problems.join("; ")}. Requesting more information rather than rejecting.`,
      citations: cite.toArray(),
    };
  }

  // 4d — nothing payable after the engine's deductions
  if (benefit.covered_amount <= 0) {
    cite.add("COV-PERIOD", "Treatment date confirmed within the covered period");
    return { recommendation: "REJECT", reasoning: `Rejected: ${benefit.reason}`, citations: cite.toArray() };
  }

  // 4e — approve for the covered amount
  cite.add("COV-PERIOD", "Treatment date confirmed within the covered period");
  if (claim.claim_type === "OUTPATIENT") {
    cite.add("OUT-LIMIT", "Per-visit and annual visit limits applied");
    if (benefit.copay_amount > 0) cite.add("OUT-COPAY", "Member copay applied");
  } else if (claim.claim_type === "INPATIENT") {
    cite.add("IN-LIMIT", "Per-admission limit and copay applied");
  }

  return {
    recommendation: "APPROVE",
    reasoning:
      `Approved. ${benefit.reason} Member responsibility: ${benefit.member_pays} ${currency} ` +
      `(copay ${benefit.copay_amount}). Remaining annual limit: ${benefit.remaining_annual_limit} ${currency}.`,
    citations: cite.toArray(),
  };
}

/* ------------------------------------------------------------------ */
/* Assemble the report                                                 */
/* ------------------------------------------------------------------ */

export function buildReport(
  claim: AssessClaim,
  policy: Policy,
  docResults: DocumentRecord[],
  necessity: MedicalNecessityResult,
  benefit: BenefitCalcResult,
): AssessmentReport {
  const { docReview, docsOk } = reviewDocuments(claim, docResults);
  const verification = verifyPolicy(claim, policy);
  const excludedHit = findExclusion(claim, policy);

  const { recommendation, reasoning, citations } = decide({
    claim, policy, verification, excludedHit, necessity, docsOk, docReview, benefit,
  });

  return {
    claim_id: claim.claim_id,
    member_name: claim.member_name,
    document_review: docReview,
    policy_verification: {
      policy_active: policy.active,
      member_covered: verification.memberCovered,
      claim_type_included: verification.claimTypeIncluded,
      within_coverage_period: verification.inPeriod,
      notes: verification.notes,
    },
    medical_necessity: { appropriate: necessity.appropriate, rationale: necessity.rationale },
    benefit_calculation: benefit,
    recommendation,
    reasoning,
    policy_citations: citations,
  };
}
