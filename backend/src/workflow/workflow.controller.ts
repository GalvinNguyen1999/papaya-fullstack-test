import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { WorkflowService } from "./workflow.service";
import { TransitionDto } from "./dto/transition.dto";
import { DecisionDto } from "./dto/decision.dto";

@ApiTags("workflow")
@Controller("claims")
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get(":id/events")
  events(@Param("id") id: string) {
    return this.workflow.getEvents(id);
  }

  @Get(":id/transitions")
  available(@Param("id") id: string) {
    return this.workflow.available(id);
  }

  @Post(":id/transition")
  transition(@Param("id") id: string, @Body() dto: TransitionDto) {
    return this.workflow.transition(id, dto);
  }

  // One-click decision used by the simple assessor UI.
  @Post(":id/decision")
  decide(@Param("id") id: string, @Body() dto: DecisionDto) {
    return this.workflow.decide(id, dto);
  }
}
