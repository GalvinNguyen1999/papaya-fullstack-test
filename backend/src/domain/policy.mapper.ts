// Maps a sold Plan + issued Policy into the domain `Policy` the engine/agent use.
// Clauses are generated from the plan's real numbers so citations stay grounded.

import type { Policy, BenefitConfig } from "./types";

interface PlanLike {
  name: string;
  annualLimit: number;
  copayPct: number;
  waitingDays: number;
  benefits: any;
}

interface PolicyLike {
  policyNumber: string;
  memberName: string;
  coverageStart: Date;
  coverageEnd: Date;
  active: boolean;
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);
const unl = (n: number, unit: string): string => (n === -1 ? "unlimited" : `${n} ${unit}`);

export function toDomainPolicy(plan: PlanLike, policy: PolicyLike): Policy {
  const b = plan.benefits ?? {};
  const copay = plan.copayPct;
  const waiting = plan.waitingDays;

  const annualCap = (benefit: any, key: string): BenefitConfig | null =>
    benefit
      ? {
          covered: true,
          copay_percentage: copay,
          waiting_period_days: waiting,
          per_event_limit: -1,
          events_per_year: -1,
          annual_benefit_limit: benefit[key],
        }
      : null;

  return {
    policy_id: policy.policyNumber,
    member_name: policy.memberName,
    currency: "THB",
    active: policy.active,
    members: [policy.memberName],
    coverage_period: { start: iso(policy.coverageStart), end: iso(policy.coverageEnd) },
    annual_limit: plan.annualLimit,
    deductible: 0,
    benefits: {
      OUTPATIENT: {
        covered: true, copay_percentage: copay, waiting_period_days: waiting,
        per_event_limit: b.outpatient?.limit_per_visit ?? -1,
        events_per_year: b.outpatient?.visits_per_year ?? -1,
      },
      INPATIENT: {
        covered: true, copay_percentage: copay, waiting_period_days: waiting,
        per_event_limit: b.inpatient?.limit_per_day ?? -1,
        events_per_year: b.inpatient?.days_per_year ?? -1,
      },
      DENTAL: annualCap(b.dental, "limit_per_year"),
      MATERNITY: annualCap(b.maternity, "limit_per_pregnancy"),
    },
    exclusions: ["Cosmetic surgery", "Pre-existing condition", "Hair transplant"],
    clauses: {
      "COV-PERIOD": `Coverage is valid for services between ${iso(policy.coverageStart)} and ${iso(policy.coverageEnd)}.`,
      "OUT-LIMIT": `Outpatient: up to ${b.outpatient?.limit_per_visit ?? "-"} THB per visit, ${unl(b.outpatient?.visits_per_year ?? -1, "visits")} per year.`,
      "OUT-COPAY": `Outpatient claims are subject to a ${copay}% member co-payment.`,
      "IN-LIMIT": `Inpatient: up to ${b.inpatient?.limit_per_day ?? "-"} THB per day, ${copay}% co-payment.`,
      "EXCL-1": "Cosmetic surgery and elective aesthetic procedures are excluded from coverage.",
      "DOC-REQ": "Claims must include all required supporting documents before assessment can complete.",
    },
  };
}
