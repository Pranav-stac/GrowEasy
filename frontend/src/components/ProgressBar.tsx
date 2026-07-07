"use client";

import { useEffect, useRef, useState } from "react";

interface ProgressBarProps {
  processed: number;
  total: number;
  message?: string;
  phase?: "mapping" | "extracting" | "complete";
  active?: boolean;
}

export function ProgressBar({
  processed,
  total,
  message,
  phase = "extracting",
  active = true,
}: ProgressBarProps) {
  const targetPercent = total > 0 ? Math.min(100, (processed / total) * 100) : 0;
  const [displayPercent, setDisplayPercent] = useState(0);
  const lastTargetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setDisplayPercent(0);
      return;
    }

    const tick = () => {
      setDisplayPercent((current) => {
        const target = targetPercent;
        const stalled = target === lastTargetRef.current && target < 100;

        if (current < target) {
          const step = Math.max(0.4, (target - current) * 0.15);
          return Math.min(target, current + step);
        }

        if (stalled && current < 92) {
          const ceiling =
            phase === "mapping" ? 18 : Math.max(target + 8, 25);
          if (current < ceiling) return current + 0.12;
        }

        return current;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    lastTargetRef.current = targetPercent;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, targetPercent, phase]);

  useEffect(() => {
    if (targetPercent >= 100) {
      setDisplayPercent(100);
    }
  }, [targetPercent]);

  const rounded = Math.round(displayPercent);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">
          {phase === "mapping" ? "Analyzing file" : "AI Processing"}
        </p>
        <span className="text-sm text-[var(--muted)]">{rounded}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full bg-[var(--primary)] transition-[width] duration-150 ease-out ${
            phase === "mapping" && rounded < 20 ? "progress-pulse" : ""
          }`}
          style={{ width: `${displayPercent}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {message ??
          (total > 0
            ? `Processing ${processed} of ${total} rows with AI…`
            : "Starting import…")}
      </p>
    </div>
  );
}
