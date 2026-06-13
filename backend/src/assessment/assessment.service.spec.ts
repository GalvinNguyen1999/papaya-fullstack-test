// INTEGRATION — exercises the whole assessment use-case (service → utils) with
// a fake repository + fake LLM, so it runs without a database. Covers the
// Prisma-row → domain mapping that unit tests of buildReport don't reach.

import { AssessmentService } from "./assessment.service";
import { AssessmentRepository } from "./assessment.repository";
import { LlmService } from "../llm/llm.service";

const SILVER_PLAN = {
  name: "Silver",
  annualLimit: 1_500_000,
  copayPct: 10,
  waitingDays: 15,
  benefits: {
    outpatient: { limit_per_visit: 5000, visits_per_year: 60 },
    inpatient: { limit_per_day: 25000, days_per_year: 120 },
    dental: { limit_per_year: 30000 },
    maternity: null,
  },
};

function claimFixture(over: Record<string, any> = {}) {
  return {
    id: "claim-1",
    claimNumber: "CLM-0001",
    memberName: "Tran Thi Mai",
    claimType: "OUTPATIENT",
    diagnosis: "Acute bronchitis",
    procedures: ["Consultation"],
    amount: 2500,
    treatmentStart: new Date("2024-06-10"),
    treatmentEnd: new Date("2024-06-10"),
    documents: [
      { id: "d1", type: "Itemized bill", expectedType: "Itemized bill", status: "complete", issues: [] },
      { id: "d2", type: "Doctor's note", expectedType: "Doctor's note", status: "complete", issues: [] },
    ],
    policy: {
      policyNumber: "POL-SILVER-0001",
      coverageStart: new Date("2024-01-01"),
      coverageEnd: new Date("2024-12-31"),
      active: true,
      plan: SILVER_PLAN,
    },
    ...over,
  };
}

function makeService(claim: any) {
  const saved: any[] = [];

  const repo = {
    findClaimForAssessment: async () => claim,
    saveAssessment: async (data: any) => {
      saved.push(data);
      return { id: "assessment-1", ...data };
    },
  } as unknown as AssessmentRepository;

  const llm = {
    narrate: async () => ({ narrative: "Templated summary.", provider: "template" }),
  } as unknown as LlmService;

  return { service: new AssessmentService(repo, llm), saved };
}

describe("AssessmentService (integration, fake repo)", () => {
  it("APPROVES a valid outpatient claim and persists the assessment", async () => {
    const { service, saved } = makeService(claimFixture());

    const result = await service.assess("claim-1");

    expect(result.report.recommendation).toBe("APPROVE");
    expect(result.logs.map((l) => l.tool)).toEqual([
      "verifyDocument", "verifyDocument", "lookupPolicy", "checkMedicalNecessity", "calculateBenefit",
    ]);
    // Silver copay 10% on 2500 → covered 2250
    expect(result.report.benefit_calculation.covered_amount).toBe(2250);
    expect(saved).toHaveLength(1);
    expect(saved[0].recommendation).toBe("APPROVE");
    expect(result.narrative_provider).toBe("template");
  });

  it("REJECTS an excluded cosmetic procedure with a grounded citation", async () => {
    const claim = claimFixture({
      claimType: "OUTPATIENT",
      diagnosis: "Cosmetic surgery",
      procedures: ["Rhinoplasty"],
      amount: 80000,
    });
    const { service } = makeService(claim);

    const result = await service.assess("claim-1");

    expect(result.report.recommendation).toBe("REJECT");
    expect(result.report.policy_citations.map((c) => c.clause_id)).toContain("EXCL-1");
  });

  it("REQUESTS MORE INFO when a required document is missing/mismatched", async () => {
    const claim = claimFixture({
      claimType: "INPATIENT",
      diagnosis: "Appendicitis",
      procedures: ["Appendectomy"],
      amount: 45000,
      documents: [
        { id: "d1", type: "Itemized bill", expectedType: "Itemized bill", status: "complete", issues: [] },
        { id: "d2", type: "Lab report", expectedType: "Admission note", status: "type_mismatch", issues: ["wrong type"] },
        // Discharge summary not provided at all
      ],
    });
    const { service } = makeService(claim);

    const result = await service.assess("claim-1");

    expect(result.report.recommendation).toBe("REQUEST_MORE_INFO");
    expect(result.report.document_review.some((d) => d.status !== "complete")).toBe(true);
  });
});
