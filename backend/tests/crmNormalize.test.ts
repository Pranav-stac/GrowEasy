import { describe, expect, it } from "vitest";
import { normalizeCrmRecord, normalizeCreatedAt, isValidDateString } from "../src/utils/crmNormalize.js";

describe("crmNormalize", () => {
  const base = {
    created_at: "",
    name: "Test",
    email: "",
    country_code: "",
    mobile_without_country_code: "",
    company: "",
    city: "",
    state: "",
    country: "",
    lead_owner: "",
    crm_status: "" as const,
    crm_note: "",
    data_source: "" as const,
    possession_time: "",
    description: "",
  };

  it("splits multiple emails into crm_note", () => {
    const result = normalizeCrmRecord({
      ...base,
      email: "primary@test.com; secondary@test.com",
    });
    expect(result.email).toBe("primary@test.com");
    expect(result.crm_note).toContain("secondary@test.com");
  });

  it("normalizes valid dates", () => {
    expect(isValidDateString("2026-05-13 14:20:48")).toBe(true);
    const normalized = normalizeCreatedAt("2026-05-13 14:20:48");
    expect(normalized).toMatch(/^2026-05-13/);
  });

  it("clears invalid dates", () => {
    expect(normalizeCreatedAt("not-a-date")).toBe("");
  });
});
