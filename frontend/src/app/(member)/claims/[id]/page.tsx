"use client";

import { useClaim } from "@/hooks/useApi";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, RecommendationBadge } from "@/components/app/status-badge";
import { ProgressTracker } from "@/components/app/progress-tracker";
import { PageHeader, SectionTitle, Loading, ErrorNote } from "@/components/app/feedback";
import { num } from "@/utils/format";

export default function ClaimDetailPage({ params }: { params: { id: string } }) {
  const { data: claim, isLoading, error } = useClaim(params.id);

  if (isLoading) return <Loading />;
  if (error || !claim) return <ErrorNote>Claim not found.</ErrorNote>;

  const latest = claim.assessments?.[0];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Claim ${claim.claimNumber}`} subtitle={`${claim.memberName} · ${claim.claimType}`} />

      {/* Progress hero */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-3">
            <StatusBadge status={claim.status} />
          </div>
          <ProgressTracker status={claim.status} />
        </CardContent>
      </Card>

      <SectionTitle>Claim details</SectionTitle>
      <Card className="mb-6">
        <CardContent className="pt-6 text-sm">
          <Row label="Diagnosis" value={claim.diagnosis} />
          <Row label="Procedures" value={(claim.procedures ?? []).join(", ")} />
          <Row label="Amount" value={`${num(claim.amount)} THB`} />
          <Row label="Treatment" value={`${claim.treatmentStart?.slice(0, 10)} → ${claim.treatmentEnd?.slice(0, 10)}`} />
        </CardContent>
      </Card>

      <SectionTitle>Documents</SectionTitle>
      <Card className="mb-6">
        <CardContent className="pt-6 text-sm">
          {claim.documents?.map((doc: any) => (
            <div key={doc.id} className="flex justify-between border-b py-1.5 last:border-0">
              <span>{doc.expectedType}</span>
              <span className={doc.status === "complete" ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                {doc.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {latest && (
        <>
          <SectionTitle>Latest assessment</SectionTitle>
          <Card className="mb-6">
            <CardContent className="space-y-3 pt-6 text-sm">
              <RecommendationBadge recommendation={latest.recommendation} />
              <p className="text-muted-foreground">{latest.narrative}</p>
              <p className="text-muted-foreground">
                Covered <b className="text-emerald-600">{num(latest.coveredAmount)}</b> · Copay {num(latest.copayAmount)} · You
                pay {num(latest.memberPays)} THB
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <SectionTitle>Timeline</SectionTitle>
      <Card>
        <CardContent className="pt-6 text-sm">
          <ol className="space-y-2">
            {claim.events?.map((event: any) => (
              <li key={event.id} className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
                <StatusBadge status={event.toState} />
                <span className="text-muted-foreground">
                  by {event.actorRole}
                  {event.reason ? ` — ${event.reason}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
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
