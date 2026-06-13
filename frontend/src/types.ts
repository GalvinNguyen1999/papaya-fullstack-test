// Frontend-local types (independent of the backend source).

export const BENEFIT_TYPES = ["OUTPATIENT", "INPATIENT", "DENTAL", "MATERNITY"] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];

export const DOC_STATUSES = ["complete", "incomplete", "missing", "type_mismatch"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export interface PlanBenefit {
  limit_per_visit?: number;
  visits_per_year?: number;
  limit_per_day?: number;
  days_per_year?: number;
  limit_per_year?: number;
  limit_per_pregnancy?: number;
}

export interface Plan {
  name: string;
  monthly_premium: number;
  annual_limit: number;
  benefits: {
    outpatient: PlanBenefit;
    inpatient: PlanBenefit;
    dental: PlanBenefit | null;
    maternity: PlanBenefit | null;
  };
  copay_percentage: number;
  waiting_period_days: number;
  highlights: string[];
}

export interface BenefitConfig {
  covered: boolean;
  copay_percentage: number;
  waiting_period_days: number;
  per_event_limit?: number;
  events_per_year?: number;
  annual_benefit_limit?: number;
}

export interface Policy {
  policy_id: string;
  member_name: string;
  currency: string;
  active: boolean;
  members: string[];
  coverage_period: { start: string; end: string };
  annual_limit: number;
  deductible: number;
  benefits: Record<string, BenefitConfig | null>;
  exclusions: string[];
  clauses: Record<string, string>;
}

export interface Expense {
  expense_id: string;
  date: string;
  benefit_type: BenefitType;
  sub_benefit: string;
  amount: number;
  diagnosis: string;
  provider: string;
}

export interface ExpenseResult {
  expense_id: string;
  submitted_amount: number;
  covered_amount: number;
  copay_amount: number;
  member_pays: number;
  decision: string;
  reason: string;
  remaining_annual_limit: number;
  remaining_visit_limit: number;
}

export interface CalculationOutput {
  results: ExpenseResult[];
  summary: {
    policy_id: string;
    member_name: string;
    currency: string;
    total_submitted: number;
    total_covered: number;
    total_member_pays: number;
    remaining_annual_limit: number;
    deductible_remaining: number;
    per_benefit: {
      benefit_type: string;
      events_used: number;
      remaining_events: number;
      annual_benefit_limit_remaining: number;
      total_covered: number;
    }[];
  };
}

export interface CreateClaimInput {
  policyId: string;
  claimType: BenefitType;
  diagnosis: string;
  icd10?: string;
  procedures: string[];
  amount: number;
  treatmentStart: string;
  treatmentEnd: string;
  documents: { type: string; expectedType: string; status: DocStatus; issues: string[] }[];
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
