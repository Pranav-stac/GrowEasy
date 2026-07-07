import { describe, expect, it } from "vitest";
import {
  buildTokenUsage,
  estimateNaiveBaseline,
  roundTokens,
  rowsToArrays,
  truncateValue,
} from "../src/utils/tokens.js";

describe("token utilities", () => {
  it("truncates long cell values", () => {
    const long = "a".repeat(100);
    expect(truncateValue(long).length).toBeLessThanOrEqual(61);
  });

  it("converts rows to compact arrays", () => {
    const headers = ["name", "email"];
    const rows = [{ name: "John", email: "j@test.com" }];
    expect(rowsToArrays(headers, rows)).toEqual([["John", "j@test.com"]]);
  });

  it("rounds tokens to readable numbers", () => {
    expect(roundTokens(523)).toBe(550);
    expect(roundTokens(1050)).toBe(1100);
  });

  it("computes saved tokens from baseline", () => {
    const usage = buildTokenUsage(500, 1000);
    expect(usage.tokens_used).toBe(500);
    expect(usage.baseline_tokens).toBe(1000);
    expect(usage.tokens_saved).toBe(500);
  });

  it("estimates naive baseline higher than compact approach", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      full_name: `User ${i}`,
      email: `u${i}@test.com`,
      phone: `98765432${String(i).padStart(2, "0")}`,
    }));
    const baseline = estimateNaiveBaseline(rows, Object.keys(rows[0]), 15);
    expect(baseline).toBeGreaterThan(500);
  });
});
