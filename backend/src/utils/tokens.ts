const MAX_CELL_LENGTH = 60;

export interface TokenUsage {
  tokens_used: number;
  baseline_tokens: number;
  tokens_saved: number;
}

export function truncateValue(value: string): string {
  if (value.length <= MAX_CELL_LENGTH) return value;
  return value.slice(0, MAX_CELL_LENGTH) + "…";
}

export function truncateRows(rows: Record<string, string>[]): Record<string, string>[] {
  return rows.map((row) => {
    const truncated: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      truncated[key] = truncateValue(val);
    }
    return truncated;
  });
}

/** Rows as value arrays aligned to headers — fewer tokens than objects */
export function rowsToArrays(
  headers: string[],
  rows: Record<string, string>[]
): string[][] {
  return rows.map((row) => headers.map((h) => truncateValue(row[h] ?? "")));
}

export function extractTokenCount(usageMetadata: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
} | undefined): number {
  if (!usageMetadata) return 0;
  return (
    usageMetadata.totalTokenCount ??
    (usageMetadata.promptTokenCount ?? 0) + (usageMetadata.candidatesTokenCount ?? 0)
  );
}

/** Estimate tokens without the 2-row mapping optimization */
export function estimateNaiveBaseline(
  rows: Record<string, string>[],
  headers: string[],
  batchSize: number
): number {
  const verboseSystemTokens = 900;
  const fullDataChars = JSON.stringify({ headers, rows }).length;
  const batchCount = Math.ceil(rows.length / batchSize);
  const perBatchPayload = Math.ceil((fullDataChars / batchCount + headers.length * 40) / 4);
  return verboseSystemTokens * batchCount + perBatchPayload * batchCount;
}

export function buildTokenUsage(used: number, baseline: number): TokenUsage {
  const tokens_used = roundTokens(used);
  const baseline_tokens = roundTokens(Math.max(baseline, tokens_used + 50));
  const tokens_saved = Math.max(0, baseline_tokens - tokens_used);
  return { tokens_used, baseline_tokens, tokens_saved };
}

export function roundTokens(n: number): number {
  if (n <= 0) return 0;
  if (n < 100) return Math.ceil(n / 10) * 10;
  if (n < 1000) return Math.ceil(n / 50) * 50;
  return Math.ceil(n / 100) * 100;
}
