interface ProgressBarProps {
  processed: number;
  total: number;
  message?: string;
}

export function ProgressBar({ processed, total, message }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">AI Processing</p>
        <span className="text-sm text-[var(--muted)]">{percent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="progress-pulse h-full rounded-full bg-[var(--primary)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {message ?? `Processing ${processed} of ${total} rows with AI...`}
      </p>
    </div>
  );
}
