import type { Expense } from "../domain/types";

// A 20-expense dataset that exercises every coverage rule (Challenge 06 demo).
export const SAMPLE_EXPENSES: Expense[] = [
  { expense_id: "EXP-001", date: "2024-01-10", benefit_type: "OUTPATIENT", sub_benefit: "Doctor Visit", amount: 2500, diagnosis: "Acute bronchitis", provider: "Bangkok Hospital" },
  { expense_id: "EXP-002", date: "2024-01-25", benefit_type: "INPATIENT", sub_benefit: "Hospitalization", amount: 8000, diagnosis: "Appendicitis", provider: "Bumrungrad" },
  { expense_id: "EXP-003", date: "2024-02-05", benefit_type: "INPATIENT", sub_benefit: "Hospital Stay", amount: 10000, diagnosis: "Pneumonia", provider: "Bumrungrad" },
  { expense_id: "EXP-004", date: "2024-02-10", benefit_type: "OUTPATIENT", sub_benefit: "Doctor Visit", amount: 2000, diagnosis: "Influenza", provider: "Samitivej" },
  { expense_id: "EXP-005", date: "2024-02-15", benefit_type: "OUTPATIENT", sub_benefit: "Specialist Consult", amount: 4000, diagnosis: "Migraine", provider: "Samitivej" },
  { expense_id: "EXP-006", date: "2024-03-01", benefit_type: "DENTAL", sub_benefit: "Scaling", amount: 5000, diagnosis: "Dental cleaning", provider: "Smile Dental" },
  { expense_id: "EXP-007", date: "2024-03-12", benefit_type: "MATERNITY", sub_benefit: "Delivery", amount: 50000, diagnosis: "Childbirth", provider: "BNH Hospital" },
  { expense_id: "EXP-008", date: "2024-03-20", benefit_type: "OUTPATIENT", sub_benefit: "Rhinoplasty Consult", amount: 8000, diagnosis: "Cosmetic surgery", provider: "Aesthetic Clinic" },
  { expense_id: "EXP-009", date: "2024-04-02", benefit_type: "DENTAL", sub_benefit: "Filling", amount: 6000, diagnosis: "Dental caries", provider: "Smile Dental" },
  { expense_id: "EXP-010", date: "2024-04-15", benefit_type: "DENTAL", sub_benefit: "Root Canal", amount: 20000, diagnosis: "Pulpitis", provider: "Smile Dental" },
  { expense_id: "EXP-011", date: "2024-05-01", benefit_type: "DENTAL", sub_benefit: "Crown", amount: 12000, diagnosis: "Tooth fracture", provider: "Smile Dental" },
  { expense_id: "EXP-012", date: "2024-05-20", benefit_type: "DENTAL", sub_benefit: "Whitening", amount: 3000, diagnosis: "Teeth whitening", provider: "Smile Dental" },
  { expense_id: "EXP-013", date: "2024-06-01", benefit_type: "INPATIENT", sub_benefit: "Hospital Stay", amount: 9000, diagnosis: "Dengue fever", provider: "Bangkok Hospital" },
  { expense_id: "EXP-014", date: "2024-06-15", benefit_type: "INPATIENT", sub_benefit: "Hospital Stay", amount: 7000, diagnosis: "Post-surgery recovery", provider: "Bangkok Hospital" },
  { expense_id: "EXP-015", date: "2024-07-01", benefit_type: "INPATIENT", sub_benefit: "Hospital Stay", amount: 8000, diagnosis: "Relapse", provider: "Bangkok Hospital" },
  { expense_id: "EXP-016", date: "2024-08-01", benefit_type: "OUTPATIENT", sub_benefit: "Doctor Visit", amount: 2000, diagnosis: "Allergic rhinitis", provider: "Samitivej" },
  { expense_id: "EXP-017", date: "2024-09-01", benefit_type: "OUTPATIENT", sub_benefit: "Physiotherapy", amount: 3000, diagnosis: "Lower back pain", provider: "Samitivej" },
  { expense_id: "EXP-018", date: "2024-10-01", benefit_type: "OUTPATIENT", sub_benefit: "Specialist Consult", amount: 5000, diagnosis: "Arrhythmia", provider: "Bangkok Heart" },
  { expense_id: "EXP-019", date: "2024-11-01", benefit_type: "OUTPATIENT", sub_benefit: "Doctor Visit", amount: 2500, diagnosis: "Fever", provider: "Samitivej" },
  { expense_id: "EXP-020", date: "2024-12-01", benefit_type: "OUTPATIENT", sub_benefit: "Doctor Visit", amount: 1800, diagnosis: "Cough", provider: "Samitivej" },
];
