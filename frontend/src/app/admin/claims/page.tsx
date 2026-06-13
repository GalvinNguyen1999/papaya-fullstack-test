"use client";

import Link from "next/link";
import { useState } from "react";

import { useClaims } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/app/status-badge";
import { PageHeader, Loading, EmptyState } from "@/components/app/feedback";
import { num } from "@/utils/format";

const FILTERS = ["all", "SUBMITTED", "DOCUMENTS_VERIFIED", "UNDER_ASSESSMENT", "APPROVED", "REJECTED", "CLOSED"];

export default function AdminQueuePage() {
  const [status, setStatus] = useState("all");
  const { data: claims, isLoading } = useClaims(status === "all" ? undefined : status);

  return (
    <div>
      <PageHeader title="Claims queue" subtitle="Assess and advance claims through the lifecycle." />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            size="sm"
            variant={status === filter ? "dark" : "outline"}
            onClick={() => setStatus(filter)}
          >
            {filter.replace(/_/g, " ").toLowerCase()}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : !claims?.length ? (
        <EmptyState>No claims in this view.</EmptyState>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latest AI</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {claims.map((claim: any) => (
                <TableRow key={claim.id}>
                  <TableCell>
                    <div className="font-mono text-xs">{claim.claimNumber}</div>
                    <div className="text-xs text-muted-foreground">{claim.memberName}</div>
                  </TableCell>
                  <TableCell>{claim.claimType}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(claim.amount)}</TableCell>
                  <TableCell><StatusBadge status={claim.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {claim.assessments?.[0]?.recommendation?.replace(/_/g, " ") ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/claims/${claim.id}`} className="text-sm font-semibold text-primary hover:underline">
                      Review →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
