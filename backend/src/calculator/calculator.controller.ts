// PRESENTATION (Challenge 06) — thin controller over CalculatorService.

import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { CalculatorService } from "./calculator.service";
import type { Policy, Expense } from "../domain/types";

@ApiTags("calculator")
@Controller("calculator")
export class CalculatorController {
  constructor(private readonly calculator: CalculatorService) {}

  @Post("run")
  run(@Body() body: { policy: Policy; expenses: Expense[] }) {
    return this.calculator.run(body.policy, body.expenses);
  }

  @Get("defaults")
  defaults(@Query("plan") planName = "Silver") {
    return this.calculator.defaults(planName);
  }
}
