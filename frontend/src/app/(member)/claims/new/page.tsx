"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { usePolicies, useCreateClaim } from "@/hooks/useApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, ErrorNote } from "@/components/app/feedback";
import { cn } from "@/lib/utils";
import { REQUIRED_DOCS, createClaimSchema } from "@/utils/validation";
import { BENEFIT_TYPES, type BenefitType } from "@/types";

const STEPS = ["Claim type", "Policy", "Treatment", "Documents", "Review"];

function Wizard() {
  const router = useRouter();
  const planHint = useSearchParams().get("plan");

  const { data: policies } = usePolicies();
  const createClaim = useCreateClaim();

  const [step, setStep] = useState(0);
  const [claimType, setClaimType] = useState<BenefitType>("OUTPATIENT");
  const [policyId, setPolicyId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [icd10, setIcd10] = useState("");
  const [procedures, setProcedures] = useState("");
  const [amount, setAmount] = useState("");
  const [treatmentStart, setTreatmentStart] = useState("2024-06-10");
  const [treatmentEnd, setTreatmentEnd] = useState("2024-06-10");
  const [docComplete, setDocComplete] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const requiredDocs = REQUIRED_DOCS[claimType];

  // Default to the policy whose plan matches the one chosen on /plans.
  useEffect(() => {
    if (!policies?.length || policyId) return;

    const matchingPlan = policies.find((p: any) => p.plan?.name?.toLowerCase() === planHint?.toLowerCase());
    setPolicyId((matchingPlan ?? policies[0]).id);
  }, [policies, policyId, planHint]);

  const documents = requiredDocs.map((docType) => ({
    type: docComplete[docType] ? docType : "Missing",
    expectedType: docType,
    status: (docComplete[docType] ? "complete" : "missing") as "complete" | "missing",
    issues: docComplete[docType] ? [] : [`Required ${docType} not attached`],
  }));

  const payload = {
    policyId,
    claimType,
    diagnosis,
    icd10: icd10 || undefined,
    procedures: procedures.split(",").map((s) => s.trim()).filter(Boolean),
    amount: Number(amount),
    treatmentStart,
    treatmentEnd,
    documents,
  };

  const submit = async () => {
    const parsed = createClaimSchema.safeParse(payload);

    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(", "));
      return;
    }

    setError(null);
    const claim = await createClaim.mutateAsync(payload);
    router.push(`/claims/${claim.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Submit a claim" subtitle={planHint ? `Plan selected: ${planHint}` : "Tell us about your treatment."} />

      {/* Stepper */}
      <div className="mb-6 flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex-1 rounded-full px-2 py-1 text-center text-xs font-semibold",
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-3">
              <Label>What type of claim?</Label>
              <div className="grid grid-cols-2 gap-3">
                {BENEFIT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setClaimType(type)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-sm font-semibold transition-colors",
                      claimType === type ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <Label>Policy</Label>
              <Select value={policyId} onValueChange={setPolicyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a policy" />
                </SelectTrigger>
                <SelectContent>
                  {policies?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.policyNumber} — {p.member?.name} ({p.plan?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label="Diagnosis">
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Acute bronchitis" />
              </Field>
              <Field label="ICD-10 (optional)">
                <Input value={icd10} onChange={(e) => setIcd10(e.target.value)} placeholder="J20.9" />
              </Field>
              <Field label="Procedures (comma-separated)">
                <Input value={procedures} onChange={(e) => setProcedures(e.target.value)} placeholder="Consultation, Chest X-ray" />
              </Field>
              <Field label="Amount (THB)">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2500" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Treatment start">
                  <Input type="date" value={treatmentStart} onChange={(e) => setTreatmentStart(e.target.value)} />
                </Field>
                <Field label="Treatment end">
                  <Input type="date" value={treatmentEnd} onChange={(e) => setTreatmentEnd(e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label>Required documents for {claimType}</Label>

              {requiredDocs.map((docType) => (
                <label key={docType} className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!docComplete[docType]}
                    onChange={(e) => setDocComplete((d) => ({ ...d, [docType]: e.target.checked }))}
                  />
                  <span>{docType}</span>
                  <Badge variant={docComplete[docType] ? "success" : "destructive"} className="ml-auto">
                    {docComplete[docType] ? "attached" : "missing"}
                  </Badge>
                </label>
              ))}

              <p className="text-xs text-muted-foreground">
                Tip: leave one unchecked to see the AI return REQUEST_MORE_INFO later.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2 text-sm">
              <Row label="Claim type" value={claimType} />
              <Row label="Policy" value={policies?.find((p: any) => p.id === policyId)?.policyNumber ?? "—"} />
              <Row label="Diagnosis" value={diagnosis || "—"} />
              <Row label="Procedures" value={procedures || "—"} />
              <Row label="Amount" value={amount ? `${amount} THB` : "—"} />
              <Row label="Treatment" value={`${treatmentStart} → ${treatmentEnd}`} />
              <Row label="Documents" value={documents.map((d) => `${d.expectedType}: ${d.status}`).join("; ")} />
            </div>
          )}

          {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}>Next</Button>
            ) : (
              <Button onClick={submit} disabled={createClaim.isPending}>
                {createClaim.isPending ? "Submitting…" : "Submit claim"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewClaimPage() {
  return (
    <Suspense fallback={null}>
      <Wizard />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
