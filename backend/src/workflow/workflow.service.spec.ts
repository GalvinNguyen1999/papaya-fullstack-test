// INTEGRATION — WorkflowService with a fake repository (no DB). Confirms the
// service derives preconditions from claim state and enforces the state machine.

import { BadRequestException } from "@nestjs/common";

import { WorkflowService } from "./workflow.service";
import { WorkflowRepository } from "./workflow.repository";

function makeService(claim: any, infoCycles = 0) {
  const applied: any[] = [];

  const repo = {
    findClaim: async () => claim,
    findClaimForTransition: async () => claim,
    countInfoCycles: async () => infoCycles,
    listEvents: async () => [],
    applyTransition: async (args: any) => {
      applied.push(args);
      return [{ id: claim.id, status: args.toState }, { id: "evt-1" }];
    },
  } as unknown as WorkflowRepository;

  return { service: new WorkflowService(repo), applied };
}

const baseClaim = {
  id: "claim-1",
  status: "SUBMITTED",
  documents: [{ status: "complete" }, { status: "complete" }],
  assessments: [],
};

describe("WorkflowService (integration, fake repo)", () => {
  it("allows a valid transition and records the audit + side effects", async () => {
    const { service, applied } = makeService(baseClaim);

    const result = await service.transition("claim-1", { to: "DOCUMENTS_VERIFIED", actorRole: "document_clerk" });

    expect(applied).toHaveLength(1);
    expect(applied[0].toState).toBe("DOCUMENTS_VERIFIED");
    expect(result.sideEffects).toContain("notify_assessor_team");
  });

  it("rejects an unauthorized role", async () => {
    const { service } = makeService(baseClaim);

    await expect(
      service.transition("claim-1", { to: "DOCUMENTS_VERIFIED", actorRole: "assessor" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects an invalid transition", async () => {
    const { service } = makeService(baseClaim);

    await expect(
      service.transition("claim-1", { to: "APPROVED", actorRole: "assessor" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("blocks PENDING_INFO once the cycle limit is reached", async () => {
    const claim = { ...baseClaim, status: "UNDER_ASSESSMENT", assessments: [{ recommendation: "REQUEST_MORE_INFO" }] };
    const { service } = makeService(claim, 3);

    await expect(
      service.transition("claim-1", { to: "PENDING_INFO", actorRole: "assessor", reason: "need docs" }),
    ).rejects.toThrow(/Maximum information requests/);
  });

  describe("decide (one click)", () => {
    it("walks SUBMITTED through to APPROVED in one call", async () => {
      const { service, applied } = makeService(baseClaim);

      await service.decide("claim-1", { decision: "APPROVE" });

      expect(applied.map((a) => a.toState)).toEqual(["DOCUMENTS_VERIFIED", "UNDER_ASSESSMENT", "APPROVED"]);
    });

    it("requires a reason to reject", async () => {
      const { service } = makeService(baseClaim);

      await expect(service.decide("claim-1", { decision: "REJECT" })).rejects.toThrow(/reason is required/i);
    });

    it("rejects an impossible decision", async () => {
      const { service } = makeService({ ...baseClaim, status: "CLOSED" });

      await expect(service.decide("claim-1", { decision: "APPROVE" })).rejects.toThrow(/Cannot/);
    });
  });
});
