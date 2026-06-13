import { Badge } from "@/components/ui/badge";

// Maps a claim status to a shadcn Badge variant.
const VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "muted"> = {
  SUBMITTED: "muted",
  DOCUMENTS_VERIFIED: "info",
  UNDER_ASSESSMENT: "warning",
  PENDING_INFO: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  PAYMENT_INITIATED: "info",
  CLOSED: "secondary",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? "muted"}>{status.replace(/_/g, " ")}</Badge>;
}

const REC_VARIANT: Record<string, "success" | "destructive" | "warning"> = {
  APPROVE: "success",
  REJECT: "destructive",
  REQUEST_MORE_INFO: "warning",
};

export function RecommendationBadge({ recommendation }: { recommendation: string }) {
  return <Badge variant={REC_VARIANT[recommendation] ?? "muted"}>{recommendation.replace(/_/g, " ")}</Badge>;
}
