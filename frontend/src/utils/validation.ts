import { z } from "zod";
import { BENEFIT_TYPES, type BenefitType } from "@/types";

export const createClaimSchema = z.object({
  policyId: z.string().min(1, "Select a policy"),
  claimType: z.enum(BENEFIT_TYPES),
  diagnosis: z.string().min(2, "Diagnosis is required"),
  icd10: z.string().optional(),
  procedures: z.array(z.string().min(1)).min(1, "At least one procedure"),
  amount: z.number().positive("Amount must be positive"),
  treatmentStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
  treatmentEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date"),
  documents: z.array(
    z.object({
      type: z.string(),
      expectedType: z.string(),
      status: z.enum(["complete", "incomplete", "missing", "type_mismatch"]),
      issues: z.array(z.string()),
    }),
  ),
});

export type CreateClaimForm = z.infer<typeof createClaimSchema>;

// Required document slots per claim type (mirrors backend reference-data).
export const REQUIRED_DOCS: Record<BenefitType, string[]> = {
  OUTPATIENT: ["Itemized bill", "Doctor's note"],
  INPATIENT: ["Itemized bill", "Admission note", "Discharge summary"],
  DENTAL: ["Dental receipt"],
  MATERNITY: ["Itemized bill", "Discharge summary"],
};
