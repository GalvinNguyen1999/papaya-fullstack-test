import { summarizeClaims } from "./analytics";

const day = (d: string) => new Date(d);

const claim = (over: Partial<Parameters<typeof summarizeClaims>[0][number]> = {}) => ({
  status: "SUBMITTED",
  claimType: "OUTPATIENT",
  amount: 1000,
  createdAt: day("2024-06-01"),
  events: [],
  ...over,
});

describe("summarizeClaims", () => {
  it("counts totals and approval rate over decided claims", () => {
    const out = summarizeClaims([
      claim({ status: "APPROVED" }),
      claim({ status: "REJECTED" }),
      claim({ status: "SUBMITTED" }), // not decided → excluded from rate
    ]);

    expect(out.total_claims).toBe(3);
    expect(out.approval_rate).toBe(50); // 1 approved of 2 decided
  });

  it("sums approved amount only", () => {
    const out = summarizeClaims([
      claim({ status: "CLOSED", amount: 4000 }),
      claim({ status: "REJECTED", amount: 9999 }),
    ]);

    expect(out.total_approved_amount).toBe(4000);
  });

  it("computes average processing days from first→last event of closed claims", () => {
    const out = summarizeClaims([
      claim({
        status: "CLOSED",
        events: [{ createdAt: day("2024-06-01") }, { createdAt: day("2024-06-05") }],
      }),
    ]);

    expect(out.avg_processing_days).toBe(4);
  });

  it("groups by status, type and month", () => {
    const out = summarizeClaims([
      claim({ status: "APPROVED", claimType: "DENTAL", createdAt: day("2024-05-10") }),
      claim({ status: "APPROVED", claimType: "DENTAL", createdAt: day("2024-06-10") }),
    ]);

    expect(out.by_type).toEqual([{ type: "DENTAL", count: 2 }]);
    expect(out.by_month).toEqual([
      { month: "2024-05", count: 1 },
      { month: "2024-06", count: 1 },
    ]);
  });

  it("is safe on empty input", () => {
    const out = summarizeClaims([]);

    expect(out.total_claims).toBe(0);
    expect(out.approval_rate).toBe(0);
    expect(out.avg_processing_days).toBe(0);
  });
});
