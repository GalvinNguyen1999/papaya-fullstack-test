// INFRASTRUCTURE — database access for the workflow use-case.

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  findClaim(claimId: string) {
    return this.prisma.claim.findUnique({ where: { id: claimId } });
  }

  findClaimForTransition(claimId: string) {
    return this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        documents: true,
        assessments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  countInfoCycles(claimId: string) {
    return this.prisma.claimEvent.count({
      where: { claimId, toState: "PENDING_INFO" },
    });
  }

  listEvents(claimId: string) {
    return this.prisma.claimEvent.findMany({
      where: { claimId },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Update status + append an immutable audit event in one transaction. */
  applyTransition(args: {
    claimId: string;
    fromState: string;
    toState: string;
    actorRole: string;
    reason?: string;
  }) {
    const { claimId, fromState, toState, actorRole, reason } = args;

    return this.prisma.$transaction([
      this.prisma.claim.update({ where: { id: claimId }, data: { status: toState as any } }),
      this.prisma.claimEvent.create({
        data: { claimId, fromState: fromState as any, toState: toState as any, actorRole, reason: reason ?? null },
      }),
    ]);
  }
}
