// INFRASTRUCTURE — database access for the analytics dashboard.

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllWithEvents() {
    return this.prisma.claim.findMany({ include: { events: true } });
  }
}
