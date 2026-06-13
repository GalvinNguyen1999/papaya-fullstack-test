import { Module } from "@nestjs/common";

import { CalculatorController } from "./calculator.controller";
import { CalculatorService } from "./calculator.service";
import { PlansModule } from "../plans/plans.module";

@Module({
  imports: [PlansModule],
  controllers: [CalculatorController],
  providers: [CalculatorService],
})
export class CalculatorModule {}
