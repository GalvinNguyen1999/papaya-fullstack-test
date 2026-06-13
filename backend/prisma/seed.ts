import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLANS = [
  {
    name: "Bronze", monthlyPremium: 150, annualLimit: 500000, copayPct: 20, waitingDays: 30,
    highlights: ["Basic coverage", "No dental or maternity"],
    benefits: {
      outpatient: { limit_per_visit: 3000, visits_per_year: 30 },
      inpatient: { limit_per_day: 10000, days_per_year: 60 },
      dental: null, maternity: null,
    },
  },
  {
    name: "Silver", monthlyPremium: 350, annualLimit: 1500000, copayPct: 10, waitingDays: 15,
    highlights: ["Includes dental", "Lower copay", "Higher limits"],
    benefits: {
      outpatient: { limit_per_visit: 5000, visits_per_year: 60 },
      inpatient: { limit_per_day: 25000, days_per_year: 120 },
      dental: { limit_per_year: 30000 }, maternity: null,
    },
  },
  {
    name: "Gold", monthlyPremium: 700, annualLimit: 5000000, copayPct: 0, waitingDays: 0,
    highlights: ["Full coverage", "No copay", "No waiting period", "Unlimited visits"],
    benefits: {
      outpatient: { limit_per_visit: 10000, visits_per_year: -1 },
      inpatient: { limit_per_day: 50000, days_per_year: -1 },
      dental: { limit_per_year: 100000 }, maternity: { limit_per_pregnancy: 200000 },
    },
  },
];

async function main() {
  // Idempotent: only seed an empty database. This keeps it safe to run on every
  // container start (so a Render restart never wipes claims a user submitted).
  // Use `npm run db:reset && npm run seed` locally for a clean slate.
  if (process.env.SEED_FORCE !== "1" && (await prisma.plan.count()) > 0) {
    console.log("Database already has data — skipping seed.");
    return;
  }

  console.log("Seeding…");

  // Clean (only reached when empty, or when SEED_FORCE=1).
  await prisma.claimEvent.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.member.deleteMany();
  await prisma.plan.deleteMany();

  const plans: Record<string, string> = {};
  for (const p of PLANS) {
    const created = await prisma.plan.create({ data: p });
    plans[p.name] = created.id;
  }

  const member = await prisma.member.create({
    data: { name: "Tran Thi Mai", email: "mai@example.com", dateOfBirth: new Date("1992-05-14") },
  });

  // Issue one policy per plan so "choose Bronze" maps to a real Bronze policy.
  const policies: Record<string, { id: string }> = {};
  for (const name of ["Bronze", "Silver", "Gold"]) {
    policies[name] = await prisma.policy.create({
      data: {
        policyNumber: `POL-${name.toUpperCase()}-0001`,
        memberId: member.id,
        planId: plans[name],
        coverageStart: new Date("2024-01-01"),
        coverageEnd: new Date("2024-12-31"),
        active: true,
      },
    });
  }
  const silver = policies["Silver"];

  // Sample claims across statuses so the ops queue + dashboard have data.
  const c1 = await prisma.claim.create({
    data: {
      claimNumber: "CLM-0001", policyId: silver.id, memberName: "Tran Thi Mai",
      claimType: "OUTPATIENT", diagnosis: "Acute bronchitis", icd10: "J20.9",
      procedures: ["Consultation", "Chest X-ray"], amount: 2500,
      treatmentStart: new Date("2024-06-10"), treatmentEnd: new Date("2024-06-10"),
      status: "SUBMITTED",
      documents: {
        create: [
          { type: "Itemized bill", expectedType: "Itemized bill", status: "complete", issues: [] },
          { type: "Doctor's note", expectedType: "Doctor's note", status: "complete", issues: [] },
        ],
      },
    },
  });

  const c2 = await prisma.claim.create({
    data: {
      claimNumber: "CLM-0002", policyId: silver.id, memberName: "Tran Thi Mai",
      claimType: "INPATIENT", diagnosis: "Appendicitis", icd10: "K35.80",
      procedures: ["Appendectomy", "Hospitalization"], amount: 45000,
      treatmentStart: new Date("2024-07-01"), treatmentEnd: new Date("2024-07-05"),
      status: "SUBMITTED",
      documents: {
        create: [
          { type: "Itemized bill", expectedType: "Itemized bill", status: "complete", issues: [] },
          { type: "Lab report", expectedType: "Admission note", status: "type_mismatch", issues: ["Submitted a Lab report where an Admission note was expected."] },
          { type: "Discharge summary", expectedType: "Discharge summary", status: "incomplete", issues: ["Unsigned and missing discharge date."] },
        ],
      },
    },
  });

  const c3 = await prisma.claim.create({
    data: {
      claimNumber: "CLM-0003", policyId: silver.id, memberName: "Tran Thi Mai",
      claimType: "OUTPATIENT", diagnosis: "Cosmetic surgery", icd10: "Z41.1",
      procedures: ["Rhinoplasty"], amount: 80000,
      treatmentStart: new Date("2024-08-15"), treatmentEnd: new Date("2024-08-15"),
      status: "DOCUMENTS_VERIFIED",
      documents: {
        create: [
          { type: "Itemized bill", expectedType: "Itemized bill", status: "complete", issues: [] },
          { type: "Doctor's note", expectedType: "Doctor's note", status: "complete", issues: [] },
        ],
      },
    },
  });

  // A closed/approved claim for dashboard variety.
  const c4 = await prisma.claim.create({
    data: {
      claimNumber: "CLM-0004", policyId: silver.id, memberName: "Tran Thi Mai",
      claimType: "DENTAL", diagnosis: "Dental caries", icd10: "K02.9",
      procedures: ["Filling"], amount: 6000,
      treatmentStart: new Date("2024-05-02"), treatmentEnd: new Date("2024-05-02"),
      status: "CLOSED",
      documents: { create: [{ type: "Dental receipt", expectedType: "Dental receipt", status: "complete", issues: [] }] },
    },
  });

  await prisma.claimEvent.createMany({
    data: [
      { claimId: c4.id, fromState: null, toState: "SUBMITTED", actorRole: "system", reason: "Claim submitted" },
      { claimId: c4.id, fromState: "SUBMITTED", toState: "DOCUMENTS_VERIFIED", actorRole: "document_clerk", reason: "Docs OK" },
      { claimId: c4.id, fromState: "DOCUMENTS_VERIFIED", toState: "UNDER_ASSESSMENT", actorRole: "team_lead", reason: "Assigned" },
      { claimId: c4.id, fromState: "UNDER_ASSESSMENT", toState: "APPROVED", actorRole: "assessor", reason: "Within limit" },
      { claimId: c4.id, fromState: "APPROVED", toState: "PAYMENT_INITIATED", actorRole: "finance", reason: "Payment requested" },
      { claimId: c4.id, fromState: "PAYMENT_INITIATED", toState: "CLOSED", actorRole: "finance", reason: "Paid" },
    ],
  });

  for (const c of [c1, c2, c3]) {
    await prisma.claimEvent.create({
      data: { claimId: c.id, fromState: null, toState: c.status, actorRole: "system", reason: "Claim submitted" },
    });
  }

  console.log("Seed complete:", { plans: Object.keys(plans), claims: 4 });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
