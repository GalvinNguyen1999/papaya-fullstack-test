import { Module } from "@nestjs/common";

import { AssessmentController } from "./assessment.controller";
import { AssessmentService } from "./assessment.service";
import { AssessmentRepository } from "./assessment.repository";

@Module({
  controllers: [AssessmentController],
  providers: [AssessmentService, AssessmentRepository],
})
export class AssessmentModule {}
