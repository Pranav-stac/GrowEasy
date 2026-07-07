import type { TokenUsage } from "@/types/crm";

interface TokenUsageBadgeProps {
  usage: TokenUsage;
  compact?: boolean;
}

export function TokenUsageBadge({ usage, compact }: TokenUsageBadgeProps) {
  if (usage.tokens_used === 0 && usage.baseline_tokens === 0) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-900/20 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
        <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-emerald-800 dark:text-emerald-200 ${compact ? "text-sm" : "text-base"}`}>
          <span>{usage.tokens_used.toLocaleString()}</span>
          <span className="mx-1.5 font-normal text-[var(--muted)]">/</span>
          <span className="font-normal text-[var(--muted)] line-through decoration-red-400 decoration-2">
            {usage.baseline_tokens.toLocaleString()}
          </span>
          <span className="ml-1 text-xs font-normal text-[var(--muted)]">tokens</span>
        </p>
        {usage.tokens_saved > 0 && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {usage.tokens_saved.toLocaleString()} tokens saved
          </p>
        )}
      </div>
    </div>
  );
}
