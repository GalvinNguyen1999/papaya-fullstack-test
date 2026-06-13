import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ClaimsService } from "./claims.service";
import { CreateClaimDto } from "./dto/create-claim.dto";

@ApiTags("claims")
@Controller()
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Get("policies")
  policies() {
    return this.claims.listPolicies();
  }

  @Post("claims")
  create(@Body() dto: CreateClaimDto) {
    return this.claims.create(dto);
  }

  @Get("claims")
  findAll(@Query("status") status?: string) {
    return this.claims.findAll(status);
  }

  @Get("claims/:id")
  findOne(@Param("id") id: string) {
    return this.claims.findOne(id);
  }
}
