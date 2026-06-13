// DOMAIN (Challenge 06) — pure coverage engine. No NestJS, no Prisma, no HTTP.
//
// Expenses are processed in CHRONOLOGICAL order because an earlier claim
// consumes limits that constrain a later one. Each expense runs a small,
// readable pipeline: first the eligibility GATES (steps 1–5, deny early), then
// the MONEY pipeline (steps 6–10). Each step below is a named helper so the
// loop reads like a checklist.

import type {
  Policy,
  Expense,
  ExpenseResult,
  BenefitConfig,
  BenefitType,
  CalculationOutput,
  Decision,
} from "./types";

const UNLIMITED = -1;

const isUnlimited = (n: number | undefined): boolean => n === UNLIMITED;
const money = (n: number): number => Math.round((n + 1e-9) * 100) / 100;
const parse = (d: string): number => Date.parse(d);
const daysBetween = (from: string, to: string): number => Math.floor((parse(to) - parse(from)) / 86_400_000);

/* ------------------------------------------------------------------ */
/* Eligibility gates (pure — return a denial reason, or null to pass)  */
/* ------------------------------------------------------------------ */

function benefitNotCoveredReason(cfg: BenefitConfig | null, type: BenefitType): string | null {
  return !cfg || !cfg.covered ? `Benefit "${type}" is not covered under this policy.` : null;
}

function outsideCoveragePeriodReason(expense: Expense, policy: Policy): string | null {
  const { start, end } = policy.coverage_period;
  const outside = parse(expense.date) < parse(start) || parse(expense.date) > parse(end);

  return outside
    ? `Service date ${expense.date} is outside the policy coverage period (${start} to ${end}).`
    : null;
}

function exclusionReason(expense: Expense, exclusions: string[]): string | null {
  const hit = exclusions.includes(expense.diagnosis.toLowerCase().trim()) || exclusions.includes(expense.sub_benefit.toLowerCase().trim());

  return hit ? `"${expense.diagnosis}" / "${expense.sub_benefit}" is an excluded condition under this policy.` : null;
}

function waitingPeriodReason(expense: Expense, cfg: BenefitConfig, policy: Policy): string | null {
  const dayOfCoverage = daysBetween(policy.coverage_period.start, expense.date);

  return dayOfCoverage < cfg.waiting_period_days
    ? `Within the ${cfg.waiting_period_days}-day waiting period for ${expense.benefit_type}. ` +
        `Day ${dayOfCoverage} of coverage; benefit starts on day ${cfg.waiting_period_days}.`
    : null;
}

/* ------------------------------------------------------------------ */
/* Money pipeline steps (pure)                                         */
/* ------------------------------------------------------------------ */

function capAtPerEventLimit(expense: Expense, cfg: BenefitConfig): { eligible: number; capped: boolean } {
  const units = expense.benefit_type === "INPATIENT" ? expense.days ?? 1 : 1;
  const perEvent = cfg.per_event_limit ?? UNLIMITED;
  const cap = isUnlimited(perEvent) ? Infinity : perEvent * units;
  const eligible = Math.min(expense.amount, cap);

  return { eligible, capped: eligible < expense.amount };
}

function applyDeductible(eligible: number, remainingDeductible: number): { applied: number; after: number } {
  const applied = Math.min(remainingDeductible, eligible);

  return { applied, after: eligible - applied };
}

function applyCopay(afterDeductible: number, copayPct: number): { copay: number; insurerWouldPay: number } {
  const copay = money((afterDeductible * copayPct) / 100);

  return { copay, insurerWouldPay: money(afterDeductible - copay) };
}

/* ------------------------------------------------------------------ */
/* Running per-benefit state                                           */
/* ------------------------------------------------------------------ */

interface BenefitState {
  events_used: number;
  annual_benefit_limit_remaining: number;
  total_covered: number;
}

export function calculateCoverage(policy: Policy, expenses: Expense[]): CalculationOutput {
  const ordered = [...expenses].sort((a, b) => parse(a.date) - parse(b.date));

  let remainingAnnual = policy.annual_limit;
  let remainingDeductible = policy.deductible ?? 0;
  const currency = policy.currency ?? "THB";
  const exclusions = (policy.exclusions ?? []).map((e) => e.toLowerCase().trim());

  const state = new Map<BenefitType, BenefitState>();
  const benefitState = (type: BenefitType, cfg: BenefitConfig): BenefitState => {
    if (!state.has(type)) {
      state.set(type, { events_used: 0, annual_benefit_limit_remaining: cfg.annual_benefit_limit ?? UNLIMITED, total_covered: 0 });
    }
    return state.get(type)!;
  };

  const results: ExpenseResult[] = [];

  for (const expense of ordered) {
    const cfg = policy.benefits[expense.benefit_type] ?? null;

    const deny = (reason: string, remainingVisits = UNLIMITED): void => {
      results.push({
        expense_id: expense.expense_id,
        submitted_amount: money(expense.amount),
        covered_amount: 0,
        copay_amount: 0,
        member_pays: money(expense.amount),
        decision: "DENIED",
        reason,
        remaining_annual_limit: isUnlimited(remainingAnnual) ? UNLIMITED : money(remainingAnnual),
        remaining_visit_limit: remainingVisits,
      });
    };

    // STEP 1 — benefit must be part of the plan.
    const notCovered = benefitNotCoveredReason(cfg, expense.benefit_type);
    if (notCovered || !cfg) {
      deny(notCovered ?? "Not covered.");
      continue;
    }

    const st = benefitState(expense.benefit_type, cfg);
    const eventsPerYear = cfg.events_per_year ?? UNLIMITED;
    const remainingEvents = isUnlimited(eventsPerYear) ? UNLIMITED : eventsPerYear - st.events_used;

    // STEP 2 — within the coverage period.
    const periodReason = outsideCoveragePeriodReason(expense, policy);
    if (periodReason) {
      deny(periodReason, remainingEvents);
      continue;
    }

    // STEP 3 — not an excluded diagnosis / procedure.
    const excluded = exclusionReason(expense, exclusions);
    if (excluded) {
      deny(excluded, remainingEvents);
      continue;
    }

    // STEP 4 — past the waiting period.
    const waiting = waitingPeriodReason(expense, cfg, policy);
    if (waiting) {
      deny(waiting, remainingEvents);
      continue;
    }

    // STEP 5 — still has visits/days left this year.
    if (!isUnlimited(eventsPerYear) && remainingEvents <= 0) {
      deny(`Annual visit limit reached for ${expense.benefit_type} (${eventsPerYear} per year).`, 0);
      continue;
    }

    // STEP 6 — cap at the per-event sub-limit.
    const { eligible: cappedEligible, capped: cappedByEvent } = capAtPerEventLimit(expense, cfg);
    let eligible = cappedEligible;

    // STEP 7 — cap at (or deny on) the benefit's annual limit.
    let cappedByBenefitAnnual = false;
    if (!isUnlimited(st.annual_benefit_limit_remaining)) {
      if (st.annual_benefit_limit_remaining <= 0) {
        st.events_used += 1;
        deny(`Annual ${expense.benefit_type} benefit limit exhausted.`, isUnlimited(eventsPerYear) ? UNLIMITED : eventsPerYear - st.events_used);
        continue;
      }
      if (eligible > st.annual_benefit_limit_remaining) {
        eligible = st.annual_benefit_limit_remaining;
        cappedByBenefitAnnual = true;
      }
    }

    // STEP 8 — consume the deductible.
    const deductible = applyDeductible(eligible, remainingDeductible);
    remainingDeductible = money(remainingDeductible - deductible.applied);

    // STEP 9 — apply the copay.
    const { copay, insurerWouldPay } = applyCopay(deductible.after, cfg.copay_percentage);

    // STEP 10 — cap at (or deny on) the policy's annual limit.
    let covered = insurerWouldPay;
    let cappedByAnnual = false;
    if (!isUnlimited(remainingAnnual)) {
      if (remainingAnnual <= 0) {
        st.events_used += 1;
        deny(`Policy annual limit of ${policy.annual_limit} ${currency} exhausted.`, isUnlimited(eventsPerYear) ? UNLIMITED : eventsPerYear - st.events_used);
        continue;
      }
      if (covered > remainingAnnual) {
        covered = remainingAnnual;
        cappedByAnnual = true;
      }
    }

    // Commit the running state for this benefit.
    covered = money(covered);
    if (!isUnlimited(remainingAnnual)) remainingAnnual = money(remainingAnnual - covered);
    if (!isUnlimited(st.annual_benefit_limit_remaining)) {
      st.annual_benefit_limit_remaining = money(st.annual_benefit_limit_remaining - (covered + copay + deductible.applied));
    }
    st.events_used += 1;
    st.total_covered = money(st.total_covered + covered);

    // Build the human-readable result.
    const memberPays = money(expense.amount - covered);
    const notes = buildNotes({ currency, deductibleApplied: deductible.applied, cappedByEvent, perEvent: cfg.per_event_limit ?? UNLIMITED, cappedByBenefitAnnual, benefitType: expense.benefit_type, copayPct: cfg.copay_percentage, copay, cappedByAnnual });

    const decision = decide(covered, expense.amount, notes);
    const reason = describe(decision, covered, memberPays, currency, notes);

    results.push({
      expense_id: expense.expense_id,
      submitted_amount: money(expense.amount),
      covered_amount: covered,
      copay_amount: copay,
      member_pays: memberPays,
      decision,
      reason,
      remaining_annual_limit: isUnlimited(remainingAnnual) ? UNLIMITED : remainingAnnual,
      remaining_visit_limit: isUnlimited(eventsPerYear) ? UNLIMITED : eventsPerYear - st.events_used,
    });
  }

  return { results, summary: buildSummary(policy, currency, results, remainingAnnual, remainingDeductible, state) };
}

/* ------------------------------------------------------------------ */
/* Result-description helpers (pure)                                   */
/* ------------------------------------------------------------------ */

function buildNotes(a: {
  currency: string; deductibleApplied: number; cappedByEvent: boolean; perEvent: number;
  cappedByBenefitAnnual: boolean; benefitType: BenefitType; copayPct: number; copay: number; cappedByAnnual: boolean;
}): string[] {
  const notes: string[] = [];

  if (a.deductibleApplied > 0) notes.push(`${a.deductibleApplied} ${a.currency} applied to deductible`);
  if (a.cappedByEvent) notes.push(`capped at per-event limit of ${a.perEvent} ${a.currency}`);
  if (a.cappedByBenefitAnnual) notes.push(`capped at remaining annual ${a.benefitType} benefit limit`);
  if (a.copayPct > 0) notes.push(`${a.copayPct}% copay = ${a.copay} ${a.currency}`);
  if (a.cappedByAnnual) notes.push("reduced to remaining policy annual limit");

  return notes;
}

function decide(covered: number, submitted: number, notes: string[]): Decision {
  if (covered === 0) {
    notes.push("nothing payable after deductions");
    return "DENIED";
  }
  return covered >= submitted ? "COVERED" : "PARTIALLY_COVERED";
}

function describe(decision: Decision, covered: number, memberPays: number, currency: string, notes: string[]): string {
  if (decision === "COVERED") return `Fully covered: ${covered} ${currency}.`;

  const label = decision === "DENIED" ? "Denied" : "Partially covered";
  return `${label}: ${notes.join("; ")}. Insurer pays ${covered}, member pays ${memberPays} ${currency}.`;
}

function buildSummary(
  policy: Policy,
  currency: string,
  results: ExpenseResult[],
  remainingAnnual: number,
  remainingDeductible: number,
  state: Map<BenefitType, BenefitState>,
) {
  const perBenefit = Array.from(state.entries()).map(([type, st]) => {
    const eventsPerYear = policy.benefits[type]!.events_per_year ?? UNLIMITED;
    return {
      benefit_type: type,
      events_used: st.events_used,
      remaining_events: isUnlimited(eventsPerYear) ? UNLIMITED : eventsPerYear - st.events_used,
      annual_benefit_limit_remaining: st.annual_benefit_limit_remaining,
      total_covered: st.total_covered,
    };
  });

  const totalSubmitted = money(results.reduce((s, r) => s + r.submitted_amount, 0));
  const totalCovered = money(results.reduce((s, r) => s + r.covered_amount, 0));

  return {
    policy_id: policy.policy_id,
    member_name: policy.member_name ?? "",
    currency,
    total_submitted: totalSubmitted,
    total_covered: totalCovered,
    total_member_pays: money(totalSubmitted - totalCovered),
    remaining_annual_limit: isUnlimited(remainingAnnual) ? UNLIMITED : remainingAnnual,
    deductible_remaining: remainingDeductible,
    per_benefit: perBenefit,
  };
}
