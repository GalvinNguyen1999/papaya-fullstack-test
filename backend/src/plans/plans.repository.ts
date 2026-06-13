// INFRASTRUCTURE — database access for plans.

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.plan.findMany({ orderBy: { monthlyPremium: "asc" } });
  }

  findByName(name: string) {
    return this.prisma.plan.findUnique({ where: { name } });
  }
}
