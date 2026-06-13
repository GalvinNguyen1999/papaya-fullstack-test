// MODEL — the only module that talks to the backend. ViewModels (hooks) use it.

import type {
  Plan, CalculationOutput, Policy, Expense, AnalyticsSummary, CreateClaimInput,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.detail || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getPlans: () => req<{ plans: Plan[]; recommended: string }>("/plans"),
  getPolicies: () => req<any[]>("/policies"),
  createClaim: (input: CreateClaimInput) =>
    req<any>("/claims", { method: "POST", body: JSON.stringify(input) }),
  getClaims: (status?: string) => req<any[]>(`/claims${status ? `?status=${status}` : ""}`),
  getClaim: (id: string) => req<any>(`/claims/${id}`),
  assess: (id: string) => req<any>(`/claims/${id}/assess`, { method: "POST" }),
  getTransitions: (id: string) => req<any[]>(`/claims/${id}/transitions`),
  transition: (id: string, body: { to: string; actorRole: string; reason?: string }) =>
    req<any>(`/claims/${id}/transition`, { method: "POST", body: JSON.stringify(body) }),
  decide: (id: string, body: { decision: string; reason?: string }) =>
    req<any>(`/claims/${id}/decision`, { method: "POST", body: JSON.stringify(body) }),
  getEvents: (id: string) => req<any[]>(`/claims/${id}/events`),
  runCalculator: (policy: Policy, expenses: Expense[]) =>
    req<CalculationOutput>("/calculator/run", { method: "POST", body: JSON.stringify({ policy, expenses }) }),
  getCalculatorDefaults: (plan?: string) =>
    req<{ plan: string; policy: Policy; expenses: Expense[] }>(`/calculator/defaults${plan ? `?plan=${plan}` : ""}`),
  getAnalytics: () => req<AnalyticsSummary>("/analytics/summary"),
};
