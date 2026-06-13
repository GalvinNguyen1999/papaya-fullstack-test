// INTEGRATION — ClaimsService use-cases with a fake repository (no DB).

import { NotFoundException } from "@nestjs/common";

import { ClaimsService } from "./claims.service";
import { ClaimsRepository } from "./claims.repository";
import { CreateClaimDto } from "./dto/create-claim.dto";

function makeService(over: Partial<Record<keyof ClaimsRepository, any>> = {}) {
  const calls: any = {};

  const repo = {
    findPolicy: async (id: string) => (id === "missing" ? null : { id, member: { name: "Tran Thi Mai" } }),
    countClaims: async () => 3,
    createClaim: async (claimNumber: string, memberName: string, dto: CreateClaimDto) => {
      calls.createClaim = { claimNumber, memberName, dto };
      return { id: "claim-x", claimNumber };
    },
    findClaimDetail: async (id: string) => (id === "missing" ? null : { id, claimNumber: "CLM-0001" }),
    listClaims: async () => [],
    listPolicies: async () => [],
    ...over,
  } as unknown as ClaimsRepository;

  return { service: new ClaimsService(repo), calls };
}

const dto: CreateClaimDto = {
  policyId: "pol-1",
  claimType: "OUTPATIENT",
  diagnosis: "Acute bronchitis",
  procedures: ["Consultation"],
  amount: 2500,
  treatmentStart: "2024-06-10",
  treatmentEnd: "2024-06-10",
  documents: [],
};

describe("ClaimsService (integration, fake repo)", () => {
  it("generates the next zero-padded claim number and uses the policy's member", async () => {
    const { service, calls } = makeService();

    const claim = await service.create(dto);

    expect(claim.claimNumber).toBe("CLM-0004"); // count 3 → next 4
    expect(calls.createClaim.memberName).toBe("Tran Thi Mai");
  });

  it("throws NotFound when the policy does not exist", async () => {
    const { service } = makeService();

    await expect(service.create({ ...dto, policyId: "missing" })).rejects.toThrow(NotFoundException);
  });

  it("throws NotFound when a claim detail is missing", async () => {
    const { service } = makeService();

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });
});
