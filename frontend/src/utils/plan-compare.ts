// Pure business logic for the plan comparison (#01). Lives in utils + tested,
// so the View only renders.

import type { Plan } from "@/types";
import { thb } from "@/utils/format";

/** Recommended plan = best coverage per premium (annual limit / annual premium). */
export function recommendedPlan(plans: Plan[]): string {
  if (!plans.length) return "";
  return plans.reduce((best, p) =>
    p.annual_limit / (p.monthly_premium * 12) > best.annual_limit / (best.monthly_premium * 12) ? p : best,
  ).name;
}

export interface CompareRow {
  key: string;
  best: string | null; // plan name that wins this row, or null
  format: (p: Plan) => string | null; // display value, or null = not included
}

const outpatientValue = (p: Plan): number =>
  p.benefits.outpatient.visits_per_year === -1
    ? Infinity
    : (p.benefits.outpatient.limit_per_visit ?? 0) * (p.benefits.outpatient.visits_per_year ?? 0);

const dentalValue = (p: Plan): number => p.benefits.dental?.limit_per_year ?? 0;

export function comparisonRows(plans: Plan[]): CompareRow[] {
  const max = (f: (p: Plan) => number): string => plans.reduce((b, p) => (f(p) > f(b) ? p : b)).name;
  const min = (f: (p: Plan) => number): string => plans.reduce((b, p) => (f(p) < f(b) ? p : b)).name;

  return [
    { key: "Monthly premium", best: min((p) => p.monthly_premium), format: (p) => thb(p.monthly_premium) },
    { key: "Annual limit", best: max((p) => p.annual_limit), format: (p) => thb(p.annual_limit) },
    {
      key: "Outpatient", best: max(outpatientValue),
      format: (p) =>
        `${thb(p.benefits.outpatient.limit_per_visit ?? 0)} / visit · ${
          p.benefits.outpatient.visits_per_year === -1 ? "Unlimited" : (p.benefits.outpatient.visits_per_year ?? 0) + "/yr"
        }`,
    },
    {
      key: "Inpatient", best: max((p) => p.benefits.inpatient.limit_per_day ?? 0),
      format: (p) => `${thb(p.benefits.inpatient.limit_per_day ?? 0)} / day`,
    },
    {
      key: "Dental", best: max(dentalValue),
      format: (p) => (p.benefits.dental ? `Up to ${thb(p.benefits.dental.limit_per_year ?? 0)}/yr` : null),
    },
    {
      key: "Maternity", best: plans.find((p) => p.benefits.maternity)?.name ?? null,
      format: (p) => (p.benefits.maternity ? `Up to ${thb(p.benefits.maternity.limit_per_pregnancy ?? 0)}` : null),
    },
    { key: "Co-payment", best: min((p) => p.copay_percentage), format: (p) => `${p.copay_percentage}%` },
    { key: "Waiting period", best: min((p) => p.waiting_period_days), format: (p) => `${p.waiting_period_days} days` },
  ];
}
