import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class HealthController {
  @Get("health")
  health() {
    const llm = process.env.OPENAI_API_KEY ? "openai" : process.env.JINA_API_KEY ? "jina" : "template";
    return { status: "ok", llm_provider: llm, time: new Date().toISOString() };
  }
}
