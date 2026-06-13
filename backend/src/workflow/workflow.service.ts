// APPLICATION (Challenge 14) — drives the claim lifecycle. Preconditions are
// derived from real claim state (documents, assessment) where it matters and
// mocked for external systems (payment). DB access goes through the repository;
// the transition rules live in domain/workflow.machine.

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { availableTransitions, checkTransition, pathFor, TRANSITIONS, type Decision } from "../domain/workflow.machine";
import { WorkflowRepository } from "./workflow.repository";
import { TransitionDto } from "./dto/transition.dto";
import { DecisionDto } from "./dto/decision.dto";
import type { ClaimStatus, Role } from "../domain/types";

@Injectable()
export class WorkflowService {
  constructor(private readonly repo: WorkflowRepository) {}

  async getEvents(claimId: string) {
    await this.ensureClaim(claimId);

    return this.repo.listEvents(claimId);
  }

  async available(claimId: string) {
    const claim = await this.ensureClaim(claimId);

    return availableTransitions(claim.status as ClaimStatus);
  }

  async transition(claimId: string, dto: TransitionDto) {
    const claim = await this.repo.findClaimForTransition(claimId);

    if (!claim) {
      throw new NotFoundException(`Claim ${claimId} not found`);
    }

    const infoCycles = await this.repo.countInfoCycles(claimId);
    const satisfied = dto.satisfied ?? this.deriveSatisfied(claim, dto.reason);

    const check = checkTransition(
      claim.status as ClaimStatus,
      dto.to as ClaimStatus,
      dto.actorRole as Role,
      { satisfied, infoCycles },
    );

    if (!check.ok) {
      throw new BadRequestException(check.error);
    }

    const [updated] = await this.repo.applyTransition({
      claimId,
      fromState: claim.status,
      toState: dto.to,
      actorRole: dto.actorRole,
      reason: dto.reason,
    });

    return {
      claim: updated,
      sideEffects: check.def?.sideEffects ?? [],
      events: await this.repo.listEvents(claimId),
    };
  }

  /**
   * One-click decision for the simple assessor UI. The user picks approve /
   * reject / request info / pay; we walk the underlying states for them and
   * record each one in the audit trail.
   */
  async decide(claimId: string, dto: DecisionDto) {
    const claim = await this.repo.findClaimForTransition(claimId);

    if (!claim) {
      throw new NotFoundException(`Claim ${claimId} not found`);
    }

    const decision = dto.decision as Decision;

    if ((decision === "REJECT" || decision === "REQUEST_INFO") && !dto.reason?.trim()) {
      throw new BadRequestException("A reason is required to reject or request more information.");
    }

    const path = pathFor(claim.status as ClaimStatus, decision);

    if (path.length === 0) {
      throw new BadRequestException(`Cannot ${decision.toLowerCase().replace("_", " ")} a claim that is ${claim.status}.`);
    }

    let current = claim.status as ClaimStatus;

    for (const to of path) {
      const def = TRANSITIONS.find((t) => t.from === current && t.to === to);
      const role = def?.roles[0] ?? "system";
      const isFinalHop = to === path[path.length - 1];

      await this.repo.applyTransition({
        claimId,
        fromState: current,
        toState: to,
        actorRole: role,
        reason: isFinalHop ? dto.reason : undefined,
      });

      current = to;
    }

    return {
      claim: await this.repo.findClaim(claimId),
      events: await this.repo.listEvents(claimId),
    };
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                          */
  /* ---------------------------------------------------------------- */

  private async ensureClaim(claimId: string) {
    const claim = await this.repo.findClaim(claimId);

    if (!claim) {
      throw new NotFoundException(`Claim ${claimId} not found`);
    }

    return claim;
  }

  /** Turn real claim state into the precondition keys the state machine checks. */
  private deriveSatisfied(claim: any, reason?: string): string[] {
    const documents = claim.documents ?? [];
    const allDocsComplete = documents.length > 0 && documents.every((d: any) => d.status === "complete");
    const latest = claim.assessments?.[0];

    const keys: string[] = [
      "assessor_assigned",
      "new_info_received",
      "payment_request_created",
      "payment_confirmed",
      "appeal_period_over",
    ];

    if (allDocsComplete) keys.push("all_documents_present");
    if (latest) keys.push("assessment_complete");
    if (latest?.recommendation === "APPROVE") keys.push("within_limit");
    if (reason && reason.trim()) keys.push("rejection_reason", "missing_info_description");

    return keys;
  }
}
