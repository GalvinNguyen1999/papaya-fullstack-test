import { calculateCoverage } from "./benefits.engine";
import type { Policy, Expense } from "./types";

const SIMPLE: Policy = {
  policy_id: "POL-TEST",
  member_name: "Test",
  currency: "THB",
  active: true,
  members: ["Test"],
  coverage_period: { start: "2024-01-01", end: "2024-12-31" },
  annual_limit: 100000,
  deductible: 0,
  benefits: {
    OUTPATIENT: { covered: true, copay_percentage: 20, waiting_period_days: 30, per_event_limit: 3000, events_per_year: 30 },
    INPATIENT: { covered: true, copay_percentage: 10, waiting_period_days: 30, per_event_limit: 10000, events_per_year: 3 },
    DENTAL: { covered: true, copay_percentage: 0, waiting_period_days: 90, per_event_limit: -1, events_per_year: -1, annual_benefit_limit: 30000 },
    MATERNITY: null,
  },
  exclusions: ["Cosmetic surgery"],
  clauses: {},
};

const exp = (over: Partial<Expense>): Expense => ({
  expense_id: "E", date: "2024-06-01", benefit_type: "OUTPATIENT",
  sub_benefit: "Doctor Visit", amount: 1000, diagnosis: "Flu", provider: "X", ...over,
});

const run = (e: Expense[], p: Policy = SIMPLE) => calculateCoverage(structuredClone(p), e);
const byId = (o: ReturnType<typeof calculateCoverage>, id: string) => o.results.find((r) => r.expense_id === id)!;

describe("benefits engine — rules", () => {
  it("applies percentage copay (partial)", () => {
    const r = run([exp({ amount: 2000 })]).results[0];
    expect(r.decision).toBe("PARTIALLY_COVERED");
    expect(r.copay_amount).toBe(400);
    expect(r.covered_amount).toBe(1600);
  });

  it("caps at per-event sub-limit", () => {
    const r = run([exp({ amount: 5000 })]).results[0];
    expect(r.covered_amount).toBe(2400);
    expect(r.member_pays).toBe(2600);
    expect(r.reason).toMatch(/per-event limit/);
  });

  it("denies inside waiting period", () => {
    const r = run([exp({ date: "2024-01-15", amount: 2000 })]).results[0];
    expect(r.decision).toBe("DENIED");
    expect(r.reason).toMatch(/waiting period/i);
  });

  it("denies excluded diagnosis", () => {
    const r = run([exp({ amount: 2000, diagnosis: "Cosmetic surgery" })]).results[0];
    expect(r.decision).toBe("DENIED");
    expect(r.reason).toMatch(/excluded/i);
  });

  it("denies benefit not in plan (maternity)", () => {
    const r = run([exp({ benefit_type: "MATERNITY", amount: 50000, diagnosis: "Childbirth" })]).results[0];
    expect(r.decision).toBe("DENIED");
    expect(r.reason).toMatch(/not covered/i);
  });

  it("consumes deductible before paying", () => {
    const p = { ...structuredClone(SIMPLE), deductible: 5000 };
    const r = run([exp({ benefit_type: "INPATIENT", amount: 10000, diagnosis: "Pneumonia" })], p).results[0];
    expect(r.covered_amount).toBe(4500);
  });

  it("fully covers when copay 0 and within limits (dental)", () => {
    const r = run([exp({ benefit_type: "DENTAL", amount: 6000, diagnosis: "Caries" })]).results[0];
    expect(r.decision).toBe("COVERED");
    expect(r.covered_amount).toBe(6000);
  });

  it("partial then exhausted on benefit annual cap", () => {
    const o = run([
      exp({ expense_id: "D1", benefit_type: "DENTAL", amount: 20000, diagnosis: "Pulpitis", date: "2024-05-01" }),
      exp({ expense_id: "D2", benefit_type: "DENTAL", amount: 20000, diagnosis: "Crown", date: "2024-06-01" }),
      exp({ expense_id: "D3", benefit_type: "DENTAL", amount: 3000, diagnosis: "Whitening", date: "2024-07-01" }),
    ]);
    expect(byId(o, "D1").covered_amount).toBe(20000);
    expect(byId(o, "D2").covered_amount).toBe(10000);
    expect(byId(o, "D3").decision).toBe("DENIED");
  });

  it("denies once event count exhausted (inpatient = 3)", () => {
    const o = run([1, 2, 3, 4].map((n) => exp({ expense_id: `IN${n}`, benefit_type: "INPATIENT", amount: 5000, diagnosis: "Care", date: `2024-0${n + 1}-01` })));
    expect(byId(o, "IN4").decision).toBe("DENIED");
    expect(byId(o, "IN4").reason).toMatch(/visit limit/i);
  });

  it("partial + exhaust on policy annual limit", () => {
    const p = { ...structuredClone(SIMPLE), annual_limit: 1000 };
    const o = run([
      exp({ expense_id: "A", amount: 2000, date: "2024-05-01" }),
      exp({ expense_id: "B", amount: 2000, date: "2024-06-01" }),
    ], p);
    expect(byId(o, "A").covered_amount).toBe(1000);
    expect(byId(o, "B").decision).toBe("DENIED");
  });

  it("processes chronologically regardless of input order", () => {
    const o = run([
      exp({ expense_id: "LATE", benefit_type: "DENTAL", amount: 20000, diagnosis: "Crown", date: "2024-06-01" }),
      exp({ expense_id: "EARLY", benefit_type: "DENTAL", amount: 20000, diagnosis: "Pulpitis", date: "2024-05-01" }),
    ]);
    expect(byId(o, "EARLY").covered_amount).toBe(20000);
    expect(byId(o, "LATE").covered_amount).toBe(10000);
  });

  it("covered + member_pays == submitted (invariant)", () => {
    const o = run([exp({ amount: 5000 }), exp({ benefit_type: "DENTAL", amount: 6000, diagnosis: "Caries" })]);
    for (const r of o.results) expect(r.covered_amount + r.member_pays).toBeCloseTo(r.submitted_amount, 2);
  });

  it("treats -1 as unlimited", () => {
    const p = structuredClone(SIMPLE);
    p.annual_limit = -1;
    p.benefits.OUTPATIENT = { covered: true, copay_percentage: 0, waiting_period_days: 0, per_event_limit: -1, events_per_year: -1 };
    const r = run([exp({ amount: 999999, date: "2024-01-02" })], p).results[0];
    expect(r.decision).toBe("COVERED");
    expect(r.covered_amount).toBe(999999);
  });
});
