// INFRASTRUCTURE — all claim/policy database access lives here.
// Services depend on this repository, never on Prisma directly.

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreateClaimDto } from "./dto/create-claim.dto";

@Injectable()
export class ClaimsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Policies the wizard can submit a claim against. */
  listPolicies() {
    return this.prisma.policy.findMany({
      include: { member: true, plan: true },
      orderBy: { policyNumber: "asc" },
    });
  }

  findPolicy(policyId: string) {
    return this.prisma.policy.findUnique({
      where: { id: policyId },
      include: { member: true },
    });
  }

  countClaims() {
    return this.prisma.claim.count();
  }

  createClaim(claimNumber: string, memberName: string, dto: CreateClaimDto) {
    return this.prisma.claim.create({
      data: {
        claimNumber,
        memberName,
        policyId: dto.policyId,
        claimType: dto.claimType as any,
        diagnosis: dto.diagnosis,
        icd10: dto.icd10,
        procedures: dto.procedures,
        amount: dto.amount,
        treatmentStart: new Date(dto.treatmentStart),
        treatmentEnd: new Date(dto.treatmentEnd),
        status: "SUBMITTED",
        documents: {
          create: (dto.documents ?? []).map((d) => ({
            type: d.type,
            expectedType: d.expectedType,
            status: d.status as any,
            issues: d.issues ?? [],
          })),
        },
        events: {
          create: { fromState: null, toState: "SUBMITTED", actorRole: "system", reason: "Claim submitted" },
        },
      },
      include: { documents: true },
    });
  }

  listClaims(status?: string) {
    return this.prisma.claim.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        documents: true,
        assessments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findClaimDetail(id: string) {
    return this.prisma.claim.findUnique({
      where: { id },
      include: {
        documents: true,
        policy: { include: { plan: true, member: true } },
        assessments: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });
  }
}
