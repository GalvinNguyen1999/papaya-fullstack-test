import { Type } from "class-transformer";
import {
  IsArray, IsIn, IsNumber, IsOptional, IsPositive, IsString, Matches, MinLength, ValidateNested,
} from "class-validator";
import { BENEFIT_TYPES, DOC_STATUSES } from "../../domain/types";

class ClaimDocumentDto {
  @IsString() type: string;
  @IsString() expectedType: string;
  @IsIn(DOC_STATUSES as unknown as string[]) status: string;
  @IsArray() @IsString({ each: true }) @IsOptional() issues: string[] = [];
}

export class CreateClaimDto {
  @IsString() policyId: string;
  @IsIn(BENEFIT_TYPES as unknown as string[]) claimType: string;
  @IsString() @MinLength(2) diagnosis: string;
  @IsString() @IsOptional() icd10?: string;
  @IsArray() @IsString({ each: true }) procedures: string[];
  @IsNumber() @IsPositive() amount: number;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) treatmentStart: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) treatmentEnd: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ClaimDocumentDto) @IsOptional()
  documents: ClaimDocumentDto[] = [];
}
