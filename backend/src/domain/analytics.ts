// DOMAIN/UTILS (Challenge 09) — pure aggregation for the dashboard. Takes raw
// claim rows (with events) and returns dashboard-ready numbers. No DB here.

interface ClaimRow {
  status: string;
  claimType: string;
  amount: number;
  createdAt: Date;
  events: { createdAt: Date }[];
}

export interface AnalyticsSummary {
  total_claims: number;
  approval_rate: number;
  avg_processing_days: number;
  total_approved_amount: number;
  by_status: { status: string; count: number }[];
  by_type: { type: string; count: number }[];
  by_month: { month: string; count: number }[];
}

const DECIDED = ["APPROVED", "REJECTED", "CLOSED", "PAYMENT_INITIATED"];
const APPROVED = ["APPROVED", "PAYMENT_INITIATED", "CLOSED"];

function countBy<T extends string>(rows: ClaimRow[], key: (c: ClaimRow) => T): [T, number][] {
  const counts = new Map<T, number>();

  for (const row of rows) {
    counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  }

  return Array.from(counts.entries());
}

function averageProcessingDays(claims: ClaimRow[]): number {
  const durations: number[] = [];

  for (const claim of claims) {
    if (claim.status !== "CLOSED" || claim.events.length < 2) continue;

    const times = claim.events.map((e) => e.createdAt.getTime()).sort((a, b) => a - b);
    durations.push((times[times.length - 1] - times[0]) / 86_400_000);
  }

  if (durations.length === 0) return 0;

  return +(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
}

export function summarizeClaims(claims: ClaimRow[]): AnalyticsSummary {
  const decided = claims.filter((c) => DECIDED.includes(c.status));
  const approved = claims.filter((c) => APPROVED.includes(c.status));

  const approvalRate = decided.length ? Math.round((approved.length / decided.length) * 100) : 0;
  const totalApproved = approved.reduce((sum, c) => sum + c.amount, 0);

  const byStatus = countBy(claims, (c) => c.status).map(([status, count]) => ({ status, count }));
  const byType = countBy(claims, (c) => c.claimType).map(([type, count]) => ({ type, count }));
  const byMonth = countBy(claims, (c) => c.createdAt.toISOString().slice(0, 7))
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    total_claims: claims.length,
    approval_rate: approvalRate,
    avg_processing_days: averageProcessingDays(claims),
    total_approved_amount: totalApproved,
    by_status: byStatus,
    by_type: byType,
    by_month: byMonth,
  };
}
