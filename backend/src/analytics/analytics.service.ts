// APPLICATION (Challenge 09) — fetches claims via the repository and delegates
// the aggregation to the pure domain/analytics helper.

import { Injectable } from "@nestjs/common";

import { summarizeClaims } from "../domain/analytics";
import { AnalyticsRepository } from "./analytics.repository";

@Injectable()
export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  async summary() {
    const claims = await this.repo.findAllWithEvents();

    return summarizeClaims(claims as any);
  }
}
