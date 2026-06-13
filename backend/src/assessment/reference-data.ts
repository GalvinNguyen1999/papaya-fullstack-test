// Static clinical/reference data used by the assessment tools.

import type { BenefitType } from "../domain/types";

export const MEDICAL_RULES: Record<
  string,
  { appropriate_procedures: string[]; necessary: boolean; note: string }
> = {
  "Acute bronchitis": { appropriate_procedures: ["Consultation", "Chest X-ray", "Medication"], necessary: true, note: "Standard outpatient management is clinically appropriate." },
  Appendicitis: { appropriate_procedures: ["Appendectomy", "Hospitalization", "Anesthesia", "Post-op care"], necessary: true, note: "Appendectomy is the standard of care for acute appendicitis." },
  "Dental caries": { appropriate_procedures: ["Filling", "Scaling"], necessary: true, note: "Restorative dental treatment is appropriate." },
  "Cosmetic surgery": { appropriate_procedures: [], necessary: false, note: "Elective cosmetic procedure with no medical indication." },
};

// Required document slots per claim type (by expected_type).
export const REQUIRED_DOCS: Record<BenefitType, string[]> = {
  OUTPATIENT: ["Itemized bill", "Doctor's note"],
  INPATIENT: ["Itemized bill", "Admission note", "Discharge summary"],
  DENTAL: ["Dental receipt"],
  MATERNITY: ["Itemized bill", "Discharge summary"],
};
