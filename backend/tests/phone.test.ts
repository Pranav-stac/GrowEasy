import { describe, expect, it } from "vitest";
import { normalizePhoneFields } from "../src/utils/phone.js";
import type { CrmRecord } from "../src/types/crm.js";

const base: CrmRecord = {
  created_at: "",
  name: "",
  email: "test@test.com",
  country_code: "",
  mobile_without_country_code: "",
  company: "",
  city: "",
  state: "",
  country: "",
  lead_owner: "",
  crm_status: "",
  crm_note: "",
  data_source: "",
  possession_time: "",
  description: "",
};

describe("normalizePhoneFields", () => {
  it("splits embedded country code from mobile", () => {
    const result = normalizePhoneFields({
      ...base,
      mobile_without_country_code: "917894561177",
    });
    expect(result.country_code).toBe("+91");
    expect(result.mobile_without_country_code).toBe("7894561177");
  });

  it("defaults to +91 for 10-digit Indian numbers", () => {
    const result = normalizePhoneFields({
      ...base,
      mobile_without_country_code: "9876543210",
    });
    expect(result.country_code).toBe("+91");
    expect(result.mobile_without_country_code).toBe("9876543210");
  });

  it("adds + prefix to country code", () => {
    const result = normalizePhoneFields({
      ...base,
      country_code: "91",
      mobile_without_country_code: "9876543210",
    });
    expect(result.country_code).toBe("+91");
  });
});
