"use client";

import {
  Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { useAnalytics } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Loading, ErrorNote } from "@/components/app/feedback";
import { num } from "@/utils/format";

// Chart colours that match the status badges used everywhere else in the app.
const STATUS_HEX: Record<string, string> = {
  SUBMITTED: "#94a3b8",
  DOCUMENTS_VERIFIED: "#3b82f6",
  UNDER_ASSESSMENT: "#f59e0b",
  PENDING_INFO: "#fb923c",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
  PAYMENT_INITIATED: "#6366f1",
  CLOSED: "#64748b",
};

const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase();

export default function DashboardPage() {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorNote>Could not load analytics.</ErrorNote>;

  const avg = data.avg_processing_days;
  const kpis = [
    { label: "Total claims", value: num(data.total_claims) },
    { label: "Approval rate", value: `${data.approval_rate}%` },
    { label: "Avg processing", value: avg > 0 && avg < 1 ? "<1 d" : `${avg} d` },
    { label: "Approved amount", value: `${num(data.total_approved_amount)} THB` },
  ];

  return (
    <div>
      <PageHeader title="Claims analytics" subtitle="Operations overview across all claims." />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-xl font-extrabold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Claims by status — donut + legend (no overflowing labels) */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Claims by status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.by_status} dataKey="count" nameKey="status" innerRadius={52} outerRadius={84} paddingAngle={2}>
                  {data.by_status.map((s) => <Cell key={s.status} fill={STATUS_HEX[s.status] ?? "#cbd5e1"} />)}
                </Pie>
                <Tooltip formatter={(v: any, _n: any, p: any) => [v, humanize(p.payload.status)]} />
              </PieChart>
            </ResponsiveContainer>

            <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {data.by_status.map((s) => (
                <li key={s.status} className="flex items-center gap-1.5 text-xs">
                  <span className="size-2.5 rounded-full" style={{ background: STATUS_HEX[s.status] ?? "#cbd5e1" }} />
                  <span className="capitalize text-muted-foreground">{humanize(s.status)}</span>
                  <span className="font-semibold">{s.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Claims by type */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Claims by type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.by_type}>
                <XAxis dataKey="type" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#f6911e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Claims over time */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Claims over time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.by_month}>
                <XAxis dataKey="month" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
