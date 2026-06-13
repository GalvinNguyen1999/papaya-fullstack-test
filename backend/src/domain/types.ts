// Backend-local domain types + enums. (No shared package — each source is
// independent; small duplication is intentional for readability.)

export const BENEFIT_TYPES = ["OUTPATIENT", "INPATIENT", "DENTAL", "MATERNITY"] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];

export const CLAIM_STATUSES = [
  "SUBMITTED", "DOCUMENTS_VERIFIED", "UNDER_ASSESSMENT", "PENDING_INFO",
  "APPROVED", "REJECTED", "PAYMENT_INITIATED", "CLOSED",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const DECISIONS = ["COVERED", "PARTIALLY_COVERED", "DENIED"] as const;
export type Decision = (typeof DECISIONS)[number];

export const RECOMMENDATIONS = ["APPROVE", "REJECT", "REQUEST_MORE_INFO"] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const DOC_STATUSES = ["complete", "incomplete", "missing", "type_mismatch"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const ROLES = ["document_clerk", "team_lead", "assessor", "finance", "system"] as const;
export type Role = (typeof ROLES)[number];

// ---- Benefit / policy (Challenge 06) ----
export interface BenefitConfig {
  covered: boolean;
  copay_percentage: number;
  waiting_period_days: number;
  per_event_limit?: number; // -1 = unlimited
  events_per_year?: number; // -1 = unlimited
  annual_benefit_limit?: number; // -1 = unlimited
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
  benefits: Partial<Record<BenefitType, BenefitConfig | null>>;
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
  days?: number;
}

export interface ExpenseResult {
  expense_id: string;
  submitted_amount: number;
  covered_amount: number;
  copay_amount: number;
  member_pays: number;
  decision: Decision;
  reason: string;
  remaining_annual_limit: number;
  remaining_visit_limit: number;
}

export interface BenefitSummary {
  benefit_type: BenefitType;
  events_used: number;
  remaining_events: number;
  annual_benefit_limit_remaining: number;
  total_covered: number;
}

export interface CalculationSummary {
  policy_id: string;
  member_name: string;
  currency: string;
  total_submitted: number;
  total_covered: number;
  total_member_pays: number;
  remaining_annual_limit: number;
  deductible_remaining: number;
  per_benefit: BenefitSummary[];
}

export interface CalculationOutput {
  results: ExpenseResult[];
  summary: CalculationSummary;
}

export interface Plan {
  name: string;
  monthly_premium: number;
  annual_limit: number;
  benefits: {
    outpatient: { limit_per_visit?: number; visits_per_year?: number };
    inpatient: { limit_per_day?: number; days_per_year?: number };
    dental: { limit_per_year?: number } | null;
    maternity: { limit_per_pregnancy?: number } | null;
  };
  copay_percentage: number;
  waiting_period_days: number;
  highlights: string[];
}

// ---- Assessment (Challenge 11) ----
export interface DocumentRecord {
  document_id: string;
  type: string;
  expected_type: string;
  status: DocStatus;
  issues: string[];
}

export interface BenefitCalcResult {
  claim_type: BenefitType;
  submitted_amount: number;
  covered_amount: number;
  copay_amount: number;
  member_pays: number;
  decision: Decision;
  reason: string;
  remaining_annual_limit: number;
}

export interface MedicalNecessityResult {
  diagnosis: string;
  procedures: string[];
  appropriate: boolean;
  rationale: string;
}

export interface ToolCallLog {
  step: number;
  tool: string;
  input: unknown;
  output: unknown;
}

export interface PolicyCitation {
  clause_id: string;
  clause_text: string;
  used_for: string;
}

export interface AssessmentReport {
  claim_id: string;
  member_name: string;
  document_review: { document_id: string; status: DocStatus; issues: string[] }[];
  policy_verification: {
    policy_active: boolean;
    member_covered: boolean;
    claim_type_included: boolean;
    within_coverage_period: boolean;
    notes: string[];
  };
  medical_necessity: { appropriate: boolean; rationale: string };
  benefit_calculation: BenefitCalcResult;
  recommendation: Recommendation;
  reasoning: string;
  policy_citations: PolicyCitation[];
}

// ---- Workflow (Challenge 14) ----
export interface TransitionDef {
  from: ClaimStatus;
  to: ClaimStatus;
  roles: Role[];
  requires?: string[];
  sideEffects?: string[];
}
