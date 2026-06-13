import { Controller, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AssessmentService } from "./assessment.service";

@ApiTags("assessment")
@Controller("claims")
export class AssessmentController {
  constructor(private readonly assessment: AssessmentService) {}

  @Post(":id/assess")
  assess(@Param("id") id: string) {
    return this.assessment.assess(id);
  }
}
