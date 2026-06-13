import { toDomainPolicy } from "./policy.mapper";

const policyRow = {
  policyNumber: "POL-TEST",
  memberName: "Mai",
  coverageStart: new Date("2024-01-01"),
  coverageEnd: new Date("2024-12-31"),
  active: true,
};

const goldPlan = {
  name: "Gold", annualLimit: 5000000, copayPct: 0, waitingDays: 0,
  benefits: {
    outpatient: { limit_per_visit: 10000, visits_per_year: -1 },
    inpatient: { limit_per_day: 50000, days_per_year: -1 },
    dental: { limit_per_year: 100000 },
    maternity: { limit_per_pregnancy: 200000 },
  },
};

const bronzePlan = {
  name: "Bronze", annualLimit: 500000, copayPct: 20, waitingDays: 30,
  benefits: {
    outpatient: { limit_per_visit: 3000, visits_per_year: 30 },
    inpatient: { limit_per_day: 10000, days_per_year: 60 },
    dental: null, maternity: null,
  },
};

describe("toDomainPolicy", () => {
  it("maps Gold plan to a full-coverage domain policy", () => {
    const p = toDomainPolicy(goldPlan, policyRow);
    expect(p.policy_id).toBe("POL-TEST");
    expect(p.active).toBe(true);
    expect(p.members).toContain("Mai");
    expect(p.annual_limit).toBe(5000000);
    expect(p.benefits.OUTPATIENT?.copay_percentage).toBe(0);
    expect(p.benefits.OUTPATIENT?.events_per_year).toBe(-1);
    expect(p.benefits.MATERNITY?.annual_benefit_limit).toBe(200000);
  });

  it("omits dental/maternity for Bronze (null)", () => {
    const p = toDomainPolicy(bronzePlan, policyRow);
    expect(p.benefits.DENTAL).toBeNull();
    expect(p.benefits.MATERNITY).toBeNull();
    expect(p.benefits.OUTPATIENT?.per_event_limit).toBe(3000);
  });

  it("generates grounded clauses from real plan numbers", () => {
    const p = toDomainPolicy(bronzePlan, policyRow);
    expect(p.clauses["OUT-LIMIT"]).toContain("3000 THB per visit");
    expect(p.clauses["OUT-COPAY"]).toContain("20%");
    expect(p.clauses["EXCL-1"]).toMatch(/cosmetic/i);
  });

  it("uses the policy coverage period in COV-PERIOD clause", () => {
    const p = toDomainPolicy(goldPlan, policyRow);
    expect(p.coverage_period).toEqual({ start: "2024-01-01", end: "2024-12-31" });
    expect(p.clauses["COV-PERIOD"]).toContain("2024-01-01");
  });
});
