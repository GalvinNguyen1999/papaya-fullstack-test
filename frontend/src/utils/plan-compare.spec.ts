import { describe, it, expect } from "vitest";
import { recommendedPlan, comparisonRows } from "./plan-compare";
import type { Plan } from "@/types";

const PLANS: Plan[] = [
  {
    name: "Bronze", monthly_premium: 150, annual_limit: 500000, copay_percentage: 20, waiting_period_days: 30,
    highlights: [], benefits: { outpatient: { limit_per_visit: 3000, visits_per_year: 30 }, inpatient: { limit_per_day: 10000, days_per_year: 60 }, dental: null, maternity: null },
  },
  {
    name: "Silver", monthly_premium: 350, annual_limit: 1500000, copay_percentage: 10, waiting_period_days: 15,
    highlights: [], benefits: { outpatient: { limit_per_visit: 5000, visits_per_year: 60 }, inpatient: { limit_per_day: 25000, days_per_year: 120 }, dental: { limit_per_year: 30000 }, maternity: null },
  },
  {
    name: "Gold", monthly_premium: 700, annual_limit: 5000000, copay_percentage: 0, waiting_period_days: 0,
    highlights: [], benefits: { outpatient: { limit_per_visit: 10000, visits_per_year: -1 }, inpatient: { limit_per_day: 50000, days_per_year: -1 }, dental: { limit_per_year: 100000 }, maternity: { limit_per_pregnancy: 200000 } },
  },
];

const row = (k: string) => comparisonRows(PLANS).find((r) => r.key === k)!;

describe("plan-compare", () => {
  it("recommends Gold (best coverage per premium)", () => {
    expect(recommendedPlan(PLANS)).toBe("Gold");
  });

  it("cheapest premium wins the premium row", () => {
    expect(row("Monthly premium").best).toBe("Bronze");
  });

  it("highest annual limit wins", () => {
    expect(row("Annual limit").best).toBe("Gold");
  });

  it("lowest copay and waiting period win", () => {
    expect(row("Co-payment").best).toBe("Gold");
    expect(row("Waiting period").best).toBe("Gold");
  });

  it("dental best is the highest dental limit; Bronze shows not-included", () => {
    expect(row("Dental").best).toBe("Gold");
    expect(row("Dental").format(PLANS[0])).toBeNull(); // Bronze has no dental
  });

  it("maternity best is the only plan offering it", () => {
    expect(row("Maternity").best).toBe("Gold");
  });

  it("formats unlimited outpatient visits", () => {
    expect(row("Outpatient").format(PLANS[2])).toContain("Unlimited");
  });

  it("empty input is safe", () => {
    expect(recommendedPlan([])).toBe("");
  });
});
