// APPLICATION — claim use-cases. Orchestrates; all DB access goes through
// ClaimsRepository (Infrastructure).

import { Injectable, NotFoundException } from "@nestjs/common";

import { ClaimsRepository } from "./claims.repository";
import { CreateClaimDto } from "./dto/create-claim.dto";

@Injectable()
export class ClaimsService {
  constructor(private readonly claims: ClaimsRepository) {}

  listPolicies() {
    return this.claims.listPolicies();
  }

  async create(dto: CreateClaimDto) {
    const policy = await this.claims.findPolicy(dto.policyId);

    if (!policy) {
      throw new NotFoundException(`Policy ${dto.policyId} not found`);
    }

    const claimNumber = await this.nextClaimNumber();

    return this.claims.createClaim(claimNumber, policy.member.name, dto);
  }

  findAll(status?: string) {
    return this.claims.listClaims(status);
  }

  async findOne(id: string) {
    const claim = await this.claims.findClaimDetail(id);

    if (!claim) {
      throw new NotFoundException(`Claim ${id} not found`);
    }

    return claim;
  }

  private async nextClaimNumber(): Promise<string> {
    const count = await this.claims.countClaims();

    return `CLM-${String(count + 1).padStart(4, "0")}`;
  }
}
