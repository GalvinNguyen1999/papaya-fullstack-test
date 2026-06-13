import { buildReport, AssessClaim } from "./assessment.report";
import type { Policy, DocumentRecord, MedicalNecessityResult, BenefitCalcResult } from "./types";

const POLICY: Policy = {
  policy_id: "POL-1",
  member_name: "Mai",
  currency: "THB",
  active: true,
  members: ["Mai"],
  coverage_period: { start: "2024-01-01", end: "2024-12-31" },
  annual_limit: 500000,
  deductible: 0,
  benefits: {
    OUTPATIENT: { covered: true, copay_percentage: 20, waiting_period_days: 30, per_event_limit: 3000, events_per_year: 30 },
    INPATIENT: { covered: true, copay_percentage: 10, waiting_period_days: 30, per_event_limit: 100000, events_per_year: 10 },
    DENTAL: null,
    MATERNITY: null,
  },
  exclusions: ["Cosmetic surgery"],
  clauses: {
    "COV-PERIOD": "Coverage valid 2024.",
    "OUT-LIMIT": "Outpatient limits apply.",
    "OUT-COPAY": "20% copay.",
    "EXCL-1": "Cosmetic surgery excluded.",
    "DOC-REQ": "All documents required.",
  },
};

const claim = (over: Partial<AssessClaim> = {}): AssessClaim => ({
  claim_id: "CLM-1", member_name: "Mai", claim_type: "OUTPATIENT",
  diagnosis: "Acute bronchitis", procedures: ["Consultation"],
  treatment_start: "2024-06-10", treatment_end: "2024-06-10",
  required_documents: ["Itemized bill"], ...over,
});

const doc = (over: Partial<DocumentRecord>): DocumentRecord => ({
  document_id: "D1", type: "Itemized bill", expected_type: "Itemized bill", status: "complete", issues: [], ...over,
});

const necessity = (appropriate = true): MedicalNecessityResult => ({
  diagnosis: "Acute bronchitis", procedures: ["Consultation"], appropriate, rationale: "ok",
});

const benefit = (over: Partial<BenefitCalcResult> = {}): BenefitCalcResult => ({
  claim_type: "OUTPATIENT", submitted_amount: 2500, covered_amount: 2000, copay_amount: 500,
  member_pays: 500, decision: "PARTIALLY_COVERED", reason: "20% copay.", remaining_annual_limit: 498000, ...over,
});

describe("assessment report builder", () => {
  it("APPROVE: valid claim, docs complete, cites copay clause", () => {
    const r = buildReport(claim(), POLICY, [doc({})], necessity(), benefit());
    expect(r.recommendation).toBe("APPROVE");
    expect(r.policy_citations.map((c) => c.clause_id)).toContain("OUT-COPAY");
    expect(r.benefit_calculation.covered_amount).toBeLessThanOrEqual(r.benefit_calculation.submitted_amount);
  });

  it("REJECT: excluded procedure cites EXCL-1", () => {
    const r = buildReport(
      claim({ diagnosis: "Cosmetic surgery", procedures: ["Rhinoplasty"] }),
      POLICY, [doc({})], necessity(false), benefit({ covered_amount: 0, decision: "DENIED", member_pays: 2500 }),
    );
    expect(r.recommendation).toBe("REJECT");
    expect(r.policy_citations.map((c) => c.clause_id)).toContain("EXCL-1");
  });

  it("REQUEST_MORE_INFO when a required doc is missing/incomplete (not reject)", () => {
    const r = buildReport(
      claim({ required_documents: ["Itemized bill", "Discharge summary"] }),
      POLICY,
      [doc({}), doc({ document_id: "D2", type: "Lab report", expected_type: "Discharge summary", status: "type_mismatch", issues: ["wrong type"] })],
      necessity(), benefit(),
    );
    expect(r.recommendation).toBe("REQUEST_MORE_INFO");
    expect(r.document_review.some((d) => d.status !== "complete")).toBe(true);
  });

  it("citations are grounded in policy clauses only", () => {
    const r = buildReport(claim(), POLICY, [doc({})], necessity(), benefit());
    for (const c of r.policy_citations) expect(POLICY.clauses[c.clause_id]).toBe(c.clause_text);
  });
});
