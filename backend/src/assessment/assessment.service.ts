// APPLICATION (Challenge 11) — orchestrates the 4 tools in order, builds the
// grounded report via the domain layer, narrates with the LLM, and
// persists through the repository. No direct DB or business math here.

import { Injectable, NotFoundException } from "@nestjs/common";

import { LlmService } from "../llm/llm.service";
import { toDomainPolicy } from "../domain/policy.mapper";
import { calculateCoverage } from "../domain/benefits.engine";
import { buildReport, AssessClaim } from "../domain/assessment.report";
import { MEDICAL_RULES, REQUIRED_DOCS } from "./reference-data";
import { AssessmentRepository } from "./assessment.repository";
import type {
  DocumentRecord,
  MedicalNecessityResult,
  BenefitCalcResult,
  ToolCallLog,
  Policy,
} from "../domain/types";

@Injectable()
export class AssessmentService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly llm: LlmService,
  ) {}

  async assess(claimId: string) {
    const claim = await this.repo.findClaimForAssessment(claimId);

    if (!claim) {
      throw new NotFoundException(`Claim ${claimId} not found`);
    }

    const policy = this.buildPolicy(claim);

    // Run the 4 tools in order, logging each call for traceability.
    const logs: ToolCallLog[] = [];
    const log = (tool: string, input: unknown, output: unknown) =>
      logs.push({ step: logs.length + 1, tool, input, output });

    // 1 — verify every submitted document
    const docResults = this.toDocumentRecords(claim.documents);
    for (const doc of docResults) {
      log("verifyDocument", { documentId: doc.document_id }, doc);
    }

    // 2 — look up the policy terms
    log("lookupPolicy", { policyId: policy.policy_id }, { found: true });

    // 3 — check medical necessity
    const necessity = this.checkMedicalNecessity(claim.diagnosis, claim.procedures);
    log("checkMedicalNecessity", { diagnosis: claim.diagnosis, procedures: claim.procedures }, necessity);

    // 4 — calculate the benefit (shared engine)
    const benefit = this.calculateBenefit(policy, claim);
    log("calculateBenefit", { policyId: policy.policy_id, claimType: claim.claimType, amount: claim.amount }, benefit);

    // Build the grounded report (domain) and narrate it (LLM).
    const report = buildReport(this.toAssessClaim(claim), policy, docResults, necessity, benefit);
    const { narrative, provider } = await this.llm.narrate(report, logs);

    const saved = await this.repo.saveAssessment({
      claimId: claim.id,
      recommendation: report.recommendation,
      reasoning: report.reasoning,
      narrative,
      narrativeProvider: provider,
      coveredAmount: benefit.covered_amount,
      copayAmount: benefit.copay_amount,
      memberPays: benefit.member_pays,
      citations: report.policy_citations,
      toolLogs: logs,
      report,
    });

    return { id: saved.id, report, logs, narrative, narrative_provider: provider };
  }

  /* ---------------------------------------------------------------- */
  /* Mapping helpers                                                  */
  /* ---------------------------------------------------------------- */

  private buildPolicy(claim: any): Policy {
    return toDomainPolicy(claim.policy.plan, {
      policyNumber: claim.policy.policyNumber,
      memberName: claim.memberName,
      coverageStart: claim.policy.coverageStart,
      coverageEnd: claim.policy.coverageEnd,
      active: claim.policy.active,
    });
  }

  private toDocumentRecords(documents: any[]): DocumentRecord[] {
    return documents.map((d) => ({
      document_id: d.id,
      type: d.type,
      expected_type: d.expectedType,
      status: d.status,
      issues: d.issues,
    }));
  }

  private toAssessClaim(claim: any): AssessClaim {
    return {
      claim_id: claim.claimNumber,
      member_name: claim.memberName,
      claim_type: claim.claimType,
      diagnosis: claim.diagnosis,
      procedures: claim.procedures,
      treatment_start: claim.treatmentStart.toISOString().slice(0, 10),
      treatment_end: claim.treatmentEnd.toISOString().slice(0, 10),
      required_documents: REQUIRED_DOCS[claim.claimType as keyof typeof REQUIRED_DOCS] ?? [],
    };
  }

  /* ---------------------------------------------------------------- */
  /* Tools 3 & 4                                                      */
  /* ---------------------------------------------------------------- */

  private checkMedicalNecessity(diagnosis: string, procedures: string[]): MedicalNecessityResult {
    const rule = MEDICAL_RULES[diagnosis];

    if (!rule) {
      return {
        diagnosis,
        procedures,
        appropriate: false,
        rationale: `No clinical guideline found for "${diagnosis}"; cannot confirm medical necessity.`,
      };
    }

    if (!rule.necessary) {
      return { diagnosis, procedures, appropriate: false, rationale: rule.note };
    }

    const unsupported = procedures.filter((p) => !rule.appropriate_procedures.includes(p));

    return {
      diagnosis,
      procedures,
      appropriate: unsupported.length === 0,
      rationale: unsupported.length === 0 ? rule.note : `Procedures not standard for ${diagnosis}: ${unsupported.join(", ")}.`,
    };
  }

  private calculateBenefit(policy: Policy, claim: any): BenefitCalcResult {
    const expense = {
      expense_id: "CLAIM",
      date: claim.treatmentStart.toISOString().slice(0, 10),
      benefit_type: claim.claimType,
      sub_benefit: claim.procedures?.[0] ?? "Claim",
      amount: claim.amount,
      diagnosis: claim.diagnosis,
      provider: "-",
    };

    const r = calculateCoverage(policy, [expense]).results[0];

    return {
      claim_type: claim.claimType,
      submitted_amount: r.submitted_amount,
      covered_amount: r.covered_amount,
      copay_amount: r.copay_amount,
      member_pays: r.member_pays,
      decision: r.decision,
      reason: r.reason,
      remaining_annual_limit: r.remaining_annual_limit,
    };
  }
}
