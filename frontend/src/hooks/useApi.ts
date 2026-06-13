"use client";
// VIEWMODELS — TanStack Query hooks over the API client. Views consume these.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateClaimInput, Policy, Expense } from "@/types";

export const usePlans = () => useQuery({ queryKey: ["plans"], queryFn: api.getPlans });
export const usePolicies = () => useQuery({ queryKey: ["policies"], queryFn: api.getPolicies });
export const useClaims = (status?: string) =>
  useQuery({ queryKey: ["claims", status ?? "all"], queryFn: () => api.getClaims(status) });
export const useClaim = (id: string) =>
  useQuery({ queryKey: ["claim", id], queryFn: () => api.getClaim(id), enabled: !!id });
export const useAnalytics = () => useQuery({ queryKey: ["analytics"], queryFn: api.getAnalytics });
export const useTransitions = (id: string) =>
  useQuery({ queryKey: ["transitions", id], queryFn: () => api.getTransitions(id), enabled: !!id });

export function useCreateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClaimInput) => api.createClaim(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),
  });
}

export function useAssess(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.assess(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claim", id] });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}

export function useTransition(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { to: string; actorRole: string; reason?: string }) => api.transition(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claim", id] });
      qc.invalidateQueries({ queryKey: ["transitions", id] });
      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDecide(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: string; reason?: string }) => api.decide(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claim", id] });
      qc.invalidateQueries({ queryKey: ["transitions", id] });
      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useCalculator(plan?: string) {
  return useQuery({
    queryKey: ["calc-defaults", plan ?? "Silver"],
    queryFn: async () => {
      const d = await api.getCalculatorDefaults(plan);
      const result = await api.runCalculator(d.policy, d.expenses);
      return { ...d, result };
    },
  });
}

export const runCalculator = (policy: Policy, expenses: Expense[]) => api.runCalculator(policy, expenses);
