import { IsIn, IsOptional, IsString } from "class-validator";

const DECISIONS = ["APPROVE", "REJECT", "REQUEST_INFO", "PAY", "CLOSE"] as const;

export class DecisionDto {
  @IsIn(DECISIONS as unknown as string[]) decision: string;
  @IsString() @IsOptional() reason?: string;
}
