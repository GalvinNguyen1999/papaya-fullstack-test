// INFRASTRUCTURE — database access for the assessment use-case.

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findClaimForAssessment(claimId: string) {
    return this.prisma.claim.findUnique({
      where: { id: claimId },
      include: { documents: true, policy: { include: { plan: true } } },
    });
  }

  saveAssessment(data: {
    claimId: string;
    recommendation: any;
    reasoning: string;
    narrative: string;
    narrativeProvider: string;
    coveredAmount: number;
    copayAmount: number;
    memberPays: number;
    citations: any;
    toolLogs: any;
    report: any;
  }) {
    return this.prisma.assessment.create({ data });
  }
}
