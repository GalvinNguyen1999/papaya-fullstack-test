// APPLICATION — plan listing. DB access via PlansRepository.

import { Injectable } from "@nestjs/common";

import { PlansRepository } from "./plans.repository";
import type { Plan } from "../domain/types";

@Injectable()
export class PlansService {
  constructor(private readonly repo: PlansRepository) {}

  async findAll(): Promise<{ plans: Plan[]; recommended: string }> {
    const rows = await this.repo.findAll();

    const plans: Plan[] = rows.map((p: any) => ({
      name: p.name,
      monthly_premium: p.monthlyPremium,
      annual_limit: p.annualLimit,
      benefits: p.benefits,
      copay_percentage: p.copayPct,
      waiting_period_days: p.waitingDays,
      highlights: p.highlights,
    }));

    return { plans, recommended: this.recommended(plans) };
  }

  /** Best coverage per premium (annual limit / annual premium). */
  private recommended(plans: Plan[]): string {
    if (!plans.length) return "";

    return plans.reduce((best, p) =>
      p.annual_limit / (p.monthly_premium * 12) > best.annual_limit / (best.monthly_premium * 12) ? p : best,
    ).name;
  }
}
