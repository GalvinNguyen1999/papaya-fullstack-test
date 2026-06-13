"use client";

import Link from "next/link";
import { Check, X, Star } from "lucide-react";

import { usePlans } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Loading, ErrorNote } from "@/components/app/feedback";
import { thb } from "@/utils/format";
import { comparisonRows, recommendedPlan } from "@/utils/plan-compare";

export default function PlansPage() {
  const { data, isLoading, error } = usePlans();

  if (isLoading) return <Loading />;
  if (error || !data)
    return (
      <ErrorNote>
        Could not load plans. Is the API running?
        {error ? ` (${String((error as Error).message)})` : ""}
      </ErrorNote>
    );

  const plans = data.plans;
  const recommended = data.recommended || recommendedPlan(plans);
  const rows = comparisonRows(plans);

  return (
    <div>
      <PageHeader title="Choose your health plan" subtitle="Compare coverage, limits and pricing. All amounts in THB." />

      {/* items-stretch + h-full make every card the same height; mt-auto pins the buttons to one line */}
      <div className="grid items-stretch gap-6 pt-3 md:grid-cols-3">
        {plans.map((plan) => {
          const isRecommended = plan.name === recommended;

          return (
            <Card
              key={plan.name}
              className={`relative flex h-full flex-col ${isRecommended ? "border-primary shadow-md ring-1 ring-primary" : ""}`}
            >
              {isRecommended && (
                <Badge className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 px-3 py-1 shadow-sm">
                  <Star className="size-3" /> Best value
                </Badge>
              )}

              {/* ── Header: name · price · one-line summary · highlights (fixed height) ── */}
              <CardHeader className="gap-3 pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight">{thb(plan.monthly_premium)}</span>
                    <span className="text-sm text-muted-foreground">/ month</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Covers up to <span className="font-semibold text-foreground">{thb(plan.annual_limit)}</span> per year
                  </p>
                </div>

                <div className="flex min-h-[2.75rem] flex-wrap content-start gap-1.5">
                  {plan.highlights.map((h) => (
                    <Badge key={h} variant="muted">{h}</Badge>
                  ))}
                </div>
              </CardHeader>

              {/* ── Body: feature comparison (same rows for every plan) + bottom-pinned CTA ── */}
              <CardContent className="flex flex-1 flex-col pt-0">
                <dl className="border-t text-sm">
                  {rows.map((row) => {
                    const value = row.format(plan);
                    const isBest = row.best === plan.name && value !== null;

                    return (
                      <div key={row.key} className="flex items-start justify-between gap-3 border-b py-2.5">
                        <dt className="text-muted-foreground">{row.key}</dt>
                        <dd className="text-right font-semibold">
                          {value === null ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground line-through decoration-destructive/50">
                              <X className="size-3.5 text-destructive" /> Not included
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 ${isBest ? "text-emerald-600" : ""}`}>
                              <Check className="size-3.5 text-emerald-600" /> {value}
                              {isBest && <Badge variant="success" className="ml-1">Best</Badge>}
                            </span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                <Button asChild size="lg" variant={isRecommended ? "default" : "dark"} className="mt-auto">
                  <Link href={`/claims/new?plan=${plan.name}`}>Choose {plan.name}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Check className="mr-0.5 inline size-3 text-emerald-600" /> included ·
        <X className="mx-0.5 inline size-3 text-destructive" /> not included ·
        <Badge variant="success" className="mx-1 align-middle">Best</Badge> strongest in that row
      </p>
    </div>
  );
}
