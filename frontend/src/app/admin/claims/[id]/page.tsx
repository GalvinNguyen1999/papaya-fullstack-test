"use client";

import { useState } from "react";
import { Check, X, FileText, CreditCard, Sparkles, Archive } from "lucide-react";

import { useClaim, useAssess, useDecide } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/app/status-badge";
import { ProgressTracker } from "@/components/app/progress-tracker";
import { PageHeader, SectionTitle, Loading, ErrorNote } from "@/components/app/feedback";
import { num } from "@/utils/format";
import { cn } from "@/lib/utils";

const DECIDABLE = ["SUBMITTED", "DOCUMENTS_VERIFIED", "UNDER_ASSESSMENT", "PENDING_INFO"];

const REC_BANNER: Record<string, { wrap: string; icon: React.ReactNode; title: string }> = {
  APPROVE: { wrap: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: <Check className="size-5 text-emerald-600" />, title: "Approve recommended" },
  REJECT: { wrap: "border-red-200 bg-red-50 text-red-900", icon: <X className="size-5 text-red-600" />, title: "Reject recommended" },
  REQUEST_MORE_INFO: { wrap: "border-amber-200 bg-amber-50 text-amber-900", icon: <FileText className="size-5 text-amber-600" />, title: "More documents needed" },
};

export default function AdminReviewPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const { data: claim, isLoading } = useClaim(id);
  const assess = useAssess(id);
  const decide = useDecide(id);

  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (isLoading || !claim) return <Loading />;

  const latest = claim.assessments?.[0];
  const report = latest?.report;
  const rec = latest?.recommendation as string | undefined;

  const runDecision = async (decision: string, needsReason: boolean) => {
    setErr(null);
    if (needsReason && !reason.trim()) {
      setErr("Please add a short reason first.");
      return;
    }
    try {
      await decide.mutateAsync({ decision, reason: reason || undefined });
      setReason("");
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* ───────── Left: the AI review ───────── */}
      <div>
        <PageHeader title={`Claim ${claim.claimNumber}`} subtitle={`${claim.memberName} · ${claim.claimType} · ${num(claim.amount)} THB`} />

        <div className="mb-4">
          <StatusBadge status={claim.status} />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" /> AI review
            </CardTitle>
            <Button onClick={() => assess.mutate()} disabled={assess.isPending}>
              {assess.isPending ? "Checking…" : latest ? "Re-run AI check" : "Run AI check"}
            </Button>
          </CardHeader>

          {!latest && (
            <CardContent className="text-sm text-muted-foreground">
              Press <b>Run AI check</b> to have the assistant review this claim and recommend a decision.
            </CardContent>
          )}

          {report && (
            <CardContent className="space-y-5 text-sm">
              {/* Colored recommendation banner */}
              <div className={cn("flex items-start gap-3 rounded-xl border p-4", REC_BANNER[rec!]?.wrap)}>
                {REC_BANNER[rec!]?.icon}
                <div>
                  <p className="font-semibold">{REC_BANNER[rec!]?.title}</p>
                  <p className="mt-1 opacity-90">{latest.narrative}</p>
                </div>
              </div>

              {/* Money summary */}
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Insurer pays" value={`${num(report.benefit_calculation.covered_amount)}`} tone="emerald" />
                <Metric label="Member pays" value={`${num(report.benefit_calculation.member_pays)}`} tone="slate" />
                <Metric label="Submitted" value={`${num(report.benefit_calculation.submitted_amount)}`} tone="slate" />
              </div>

              {/* Checks */}
              <div className="space-y-3">
                <CheckRow ok label="Policy active & in coverage" detail={report.policy_verification.notes[0]} show={report.policy_verification.policy_active && report.policy_verification.within_coverage_period} />
                <CheckRow ok={report.medical_necessity.appropriate} label="Treatment is medically necessary" detail={report.medical_necessity.rationale} show />
                <div>
                  <p className="mb-1 font-medium">Documents</p>
                  <ul className="space-y-1">
                    {report.document_review.map((d: any, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <DocDot status={d.status} />
                        <span className="text-muted-foreground">{d.status}</span>
                        {d.issues?.length ? <span className="text-xs text-amber-700">— {d.issues.join(" ")}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Citations + technical trace (collapsed) */}
              <details className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground">Policy clauses &amp; technical details</summary>
                <ul className="mt-2 space-y-1">
                  {report.policy_citations.map((c: any) => <li key={c.clause_id}><b>{c.clause_id}</b> — “{c.clause_text}”</li>)}
                </ul>
                <p className="mt-2">Tool calls: {latest.toolLogs?.map((l: any) => l.tool).join(", ")}</p>
              </details>
            </CardContent>
          )}
        </Card>
      </div>

      {/* ───────── Right: the decision ───────── */}
      <div>
        <SectionTitle>Your decision</SectionTitle>
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
            <ProgressTracker status={claim.status} />

            {err && <ErrorNote>{err}</ErrorNote>}

            {DECIDABLE.includes(claim.status) ? (
              <>
                {!latest && (
                  <p className="rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
                    Tip: run the AI check first — it tells you the recommended decision.
                  </p>
                )}

                {claim.status === "PENDING_INFO" && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Waiting on the member to send the missing documents. Decide again once they arrive.
                  </p>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Reason (needed to reject or request documents)</label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Missing discharge summary" />
                </div>

                <div className="space-y-2.5">
                  <DecisionButton tone="emerald" title="Approve claim" subtitle={report ? `Pay ${num(report.benefit_calculation.covered_amount)} THB` : "Pay the covered amount"} suggested={rec === "APPROVE"} disabled={decide.isPending} onClick={() => runDecision("APPROVE", false)} />
                  <DecisionButton tone="amber" title="Request documents" subtitle="Ask the member for missing files" suggested={rec === "REQUEST_MORE_INFO"} disabled={decide.isPending} onClick={() => runDecision("REQUEST_INFO", true)} />
                  <DecisionButton tone="red" title="Reject claim" subtitle="Decline with a reason" suggested={rec === "REJECT"} disabled={decide.isPending} onClick={() => runDecision("REJECT", true)} />
                </div>
              </>
            ) : claim.status === "APPROVED" ? (
              <FinalAction tone="emerald" icon={<CreditCard className="size-5" />} title="Claim approved" note="Send the payout to finance to finish." button="Mark as paid" disabled={decide.isPending} onClick={() => runDecision("PAY", false)} />
            ) : claim.status === "REJECTED" ? (
              <FinalAction tone="red" icon={<Archive className="size-5" />} title="Claim rejected" note="Close it to archive." button="Close claim" disabled={decide.isPending} onClick={() => runDecision("CLOSE", false)} />
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-800">
                <Check className="mx-auto mb-1 size-6" />
                <p className="font-semibold">Claim closed</p>
                <p className="text-xs opacity-80">No further action needed.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <SectionTitle>History</SectionTitle>
          <Card>
            <CardContent className="pt-6 text-xs">
              <ol className="space-y-2">
                {claim.events?.map((e: any) => (
                  <li key={e.id} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                    <div>
                      <StatusBadge status={e.toState} />
                      <p className="mt-0.5 text-muted-foreground">{new Date(e.createdAt).toLocaleString()}{e.reason ? ` · ${e.reason}` : ""}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── small presentational pieces ── */

function Metric({ label, value, tone }: { label: string; value: string; tone: "emerald" | "slate" }) {
  return (
    <div className={cn("rounded-lg border p-3", tone === "emerald" ? "border-emerald-200 bg-emerald-50" : "bg-muted/40")}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold", tone === "emerald" && "text-emerald-700")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">THB</p>
    </div>
  );
}

function CheckRow({ ok, label, detail, show }: { ok: boolean; label: string; detail?: string; show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-start gap-2">
      {ok ? <Check className="mt-0.5 size-4 text-emerald-600" /> : <X className="mt-0.5 size-4 text-red-600" />}
      <div>
        <p className="font-medium">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function DocDot({ status }: { status: string }) {
  const color = status === "complete" ? "bg-emerald-500" : status === "missing" ? "bg-red-500" : "bg-amber-500";
  return <span className={cn("size-2 rounded-full", color)} />;
}

const TONES = {
  emerald: { ring: "ring-emerald-500", solid: "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600", soft: "border-emerald-200 text-emerald-900 hover:bg-emerald-50" },
  amber: { ring: "ring-amber-500", solid: "bg-amber-500 text-white hover:bg-amber-600 border-amber-500", soft: "border-amber-200 text-amber-900 hover:bg-amber-50" },
  red: { ring: "ring-red-500", solid: "bg-red-600 text-white hover:bg-red-700 border-red-600", soft: "border-red-200 text-red-900 hover:bg-red-50" },
};

function DecisionButton({
  tone, title, subtitle, suggested, disabled, onClick,
}: {
  tone: keyof typeof TONES; title: string; subtitle: string; suggested?: boolean; disabled?: boolean; onClick: () => void;
}) {
  const t = TONES[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors disabled:opacity-50",
        suggested ? cn(t.solid, "ring-2 ring-offset-1", t.ring) : t.soft,
      )}
    >
      <div className="flex-1">
        <p className="font-semibold leading-tight">{title}</p>
        <p className={cn("text-xs", suggested ? "opacity-90" : "text-muted-foreground")}>{subtitle}</p>
      </div>
      {suggested && <Badge variant="secondary" className="bg-white/25 text-current">AI suggests</Badge>}
    </button>
  );
}

function FinalAction({
  tone, icon, title, note, button, disabled, onClick,
}: {
  tone: keyof typeof TONES; icon: React.ReactNode; title: string; note: string; button: string; disabled?: boolean; onClick: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-3 rounded-lg border p-3", TONES[tone].soft)}>
        {icon}
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs opacity-80">{note}</p>
        </div>
      </div>
      <button onClick={onClick} disabled={disabled} className={cn("w-full rounded-lg border px-3 py-2.5 font-semibold transition-colors disabled:opacity-50", TONES[tone].solid)}>
        {button}
      </button>
    </div>
  );
}
