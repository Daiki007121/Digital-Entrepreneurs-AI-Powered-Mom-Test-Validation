// Implements #10: Next steps ordered list
interface NextStepsListProps {
  steps: string[];
}

export function NextStepsList({ steps }: NextStepsListProps) {
  if (steps.length === 0) return null;

  return (
    <ol className="space-y-3" role="list" aria-label="Recommended next steps">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <p className="text-sm text-[var(--text-secondary)] font-body pt-0.5">
            {step}
          </p>
        </li>
      ))}
    </ol>
  );
}
