import { buildTracker, type StepState } from "@/utils/lifecycle";
import { cn } from "@/lib/utils";

const DOT: Record<StepState, string> = {
  done: "bg-emerald-500 text-white",
  current: "bg-primary text-primary-foreground ring-4 ring-primary/20",
  todo: "bg-muted text-muted-foreground",
  failed: "bg-destructive text-destructive-foreground",
};

export function ProgressTracker({ status }: { status: string }) {
  const steps = buildTracker(status);

  return (
    <ol className="flex items-start py-2">
      {steps.map((step, i) => (
        <li key={i} className="flex flex-1 items-start">
          <div className="flex w-full flex-col items-center gap-1">
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", DOT[step.state])}>
              {step.state === "done" ? "✓" : step.state === "failed" ? "✕" : i + 1}
            </span>
            <span className="text-center text-[10px] font-semibold leading-tight text-muted-foreground">{step.label}</span>
          </div>

          {i < steps.length - 1 && (
            <span className={cn("mt-3.5 h-0.5 min-w-2 flex-1", step.state === "done" ? "bg-emerald-400" : "bg-border")} />
          )}
        </li>
      ))}
    </ol>
  );
}
