"use client";

import Link from "next/link";

import { useClaims } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/app/status-badge";
import { PageHeader, Loading, EmptyState } from "@/components/app/feedback";
import { num } from "@/utils/format";

export default function MyClaimsPage() {
  const { data: claims, isLoading } = useClaims();

  return (
    <div>
      <div className="flex items-center justify-between">
        <PageHeader title="My claims" subtitle="Every claim you have submitted and where it stands." />
        <Button asChild>
          <Link href="/claims/new">+ New claim</Link>
        </Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : !claims?.length ? (
        <EmptyState>You have no claims yet. Submit your first one.</EmptyState>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {claims.map((claim: any) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-mono text-xs">{claim.claimNumber}</TableCell>
                  <TableCell>{claim.claimType}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(claim.amount)}</TableCell>
                  <TableCell><StatusBadge status={claim.status} /></TableCell>
                  <TableCell className="text-right">
                    <Link href={`/claims/${claim.id}`} className="text-sm font-semibold text-primary hover:underline">
                      View →
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
