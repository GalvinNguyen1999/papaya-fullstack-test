import { Module } from "@nestjs/common";

import { ClaimsController } from "./claims.controller";
import { ClaimsService } from "./claims.service";
import { ClaimsRepository } from "./claims.repository";

@Module({
  controllers: [ClaimsController],
  providers: [ClaimsService, ClaimsRepository],
  exports: [ClaimsRepository],
})
export class ClaimsModule {}
