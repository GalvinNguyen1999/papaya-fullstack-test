// APPLICATION (Challenge 06) — runs the engine and builds the sample policy.
// Plan data comes from PlansRepository; the math comes from the domain layer.

import { Injectable, NotFoundException } from "@nestjs/common";

import { PlansRepository } from "../plans/plans.repository";
import { calculateCoverage } from "../domain/benefits.engine";
import { toDomainPolicy } from "../domain/policy.mapper";
import { SAMPLE_EXPENSES } from "./sample-expenses";
import type { Policy, Expense } from "../domain/types";

@Injectable()
export class CalculatorService {
  constructor(private readonly plans: PlansRepository) {}

  run(policy: Policy, expenses: Expense[]) {
    return calculateCoverage(policy, expenses);
  }

  async defaults(planName: string) {
    const plan = await this.plans.findByName(planName);

    if (!plan) {
      throw new NotFoundException(`Plan ${planName} not found`);
    }

    const policy = toDomainPolicy(plan as any, {
      policyNumber: `POL-${plan.name.toUpperCase()}`,
      memberName: "Demo Member",
      coverageStart: new Date("2024-01-01"),
      coverageEnd: new Date("2024-12-31"),
      active: true,
    });

    return { plan: plan.name, policy, expenses: SAMPLE_EXPENSES };
  }
}
