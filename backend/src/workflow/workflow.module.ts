import { Module } from "@nestjs/common";

import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowRepository } from "./workflow.repository";

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowRepository],
})
export class WorkflowModule {}
