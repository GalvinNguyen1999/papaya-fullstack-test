export const thb = (n: number): string =>
  n === -1 ? "Unlimited" : new Intl.NumberFormat("en-US").format(n) + " THB";

export const num = (n: number): string =>
  n === -1 ? "∞" : new Intl.NumberFormat("en-US").format(n);

export const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-slate-100 text-slate-700",
  DOCUMENTS_VERIFIED: "bg-blue-100 text-blue-700",
  UNDER_ASSESSMENT: "bg-amber-100 text-amber-700",
  PENDING_INFO: "bg-orange-100 text-orange-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  PAYMENT_INITIATED: "bg-indigo-100 text-indigo-700",
  CLOSED: "bg-slate-200 text-slate-600",
};

export const REC_COLORS: Record<string, string> = {
  APPROVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECT: "bg-red-100 text-red-800 border-red-200",
  REQUEST_MORE_INFO: "bg-amber-100 text-amber-800 border-amber-200",
};
