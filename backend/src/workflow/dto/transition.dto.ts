import { IsArray, IsOptional, IsString } from "class-validator";

export class TransitionDto {
  @IsString() to: string;
  @IsString() actorRole: string;
  @IsString() @IsOptional() reason?: string;
  /** Optional override of satisfied precondition keys (else derived from state). */
  @IsArray() @IsString({ each: true }) @IsOptional() satisfied?: string[];
}
