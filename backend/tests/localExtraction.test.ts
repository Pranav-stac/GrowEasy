import { describe, expect, it } from "vitest";
import { applyMappingToRow } from "../src/utils/localExtraction.js";
import type { MappingPlan } from "../src/services/prompts.js";

const facebookPlan: MappingPlan = {
  detected_format: "Facebook Lead Export",
  column_mappings: [
    { csv_column: "full_name", crm_field: "name" },
    { csv_column: "created_time", crm_field: "created_at" },
    { csv_column: "email", crm_field: "email" },
    { csv_column: "phone_number", crm_field: "mobile_without_country_code" },
    { csv_column: "company_name", crm_field: "company" },
    { csv_column: "city", crm_field: "city" },
    { csv_column: "region", crm_field: "state" },
    { csv_column: "country", crm_field: "country" },
    { csv_column: "notes", crm_field: "crm_note" },
    { csv_column: "lead_status", crm_field: "crm_status" },
  ],
  unmapped_columns: ["id", "platform", "form_name"],
};

describe("applyMappingToRow", () => {
  it("maps columns locally without AI", () => {
    const row = {
      id: "l_1000",
      full_name: "Rahil Sharma",
      created_time: "2026-06-29 10:00:00",
      email: "rahil@test.com",
      phone_number: "917894561177",
      company_name: "Acme Corp",
      city: "Mumbai",
      region: "Maharashtra",
      country: "India",
      lead_status: "good lead follow up",
      platform: "facebook",
      form_name: "Demo Form",
      notes: "Called twice no answer",
    };

    const headers = Object.keys(row);
    const record = applyMappingToRow(row, facebookPlan, headers);

    expect(record.name).toBe("Rahil Sharma");
    expect(record.email).toBe("rahil@test.com");
    expect(record.mobile_without_country_code).toBe("7894561177");
    expect(record.country_code).toBe("+91");
    expect(record.company).toBe("Acme Corp");
    expect(record.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(record.crm_note).toContain("Called twice no answer");
    expect(record.crm_note).toContain("platform: facebook");
  });

  it("joins first and last name when both map to name", () => {
    const plan: MappingPlan = {
      detected_format: "Google Ads",
      column_mappings: [
        { csv_column: "First Name", crm_field: "name" },
        { csv_column: "Last Name", crm_field: "name" },
        { csv_column: "Email", crm_field: "email" },
      ],
    };

    const row = { "First Name": "John", "Last Name": "Doe", Email: "j@x.com" };
    const record = applyMappingToRow(row, plan, Object.keys(row));

    expect(record.name).toBe("John Doe");
    expect(record.email).toBe("j@x.com");
  });
});
