import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { LlmModule } from "./llm/llm.module";
import { PlansModule } from "./plans/plans.module";
import { ClaimsModule } from "./claims/claims.module";
import { AssessmentModule } from "./assessment/assessment.module";
import { WorkflowModule } from "./workflow/workflow.module";
import { CalculatorModule } from "./calculator/calculator.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LlmModule,
    PlansModule,
    ClaimsModule,
    AssessmentModule,
    WorkflowModule,
    CalculatorModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
