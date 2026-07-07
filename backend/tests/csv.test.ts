import { describe, expect, it } from "vitest";
import { parseCsvBuffer, parseFileBuffer, chunkArray, hasContactInfo } from "../src/utils/spreadsheet.js";

describe("parseCsvBuffer", () => {
  it("parses standard CSV with headers", () => {
    const csv = "name,email,phone\nJohn,john@test.com,9876543210\nJane,jane@test.com,9876543211";
    const result = parseCsvBuffer(Buffer.from(csv));

    expect(result.headers).toEqual(["name", "email", "phone"]);
    expect(result.total_rows).toBe(2);
    expect(result.rows[0].name).toBe("John");
  });

  it("handles BOM prefix", () => {
    const csv = "\uFEFFname,email\nTest,test@test.com";
    const result = parseCsvBuffer(Buffer.from(csv));
    expect(result.headers[0]).toBe("name");
  });

  it("parses TSV files", () => {
    const tsv = "name\temail\nJohn\tjohn@test.com";
    const result = parseFileBuffer(Buffer.from(tsv), "leads.tsv");
    expect(result.headers).toEqual(["name", "email"]);
    expect(result.rows[0].name).toBe("John");
  });
});

describe("chunkArray", () => {
  it("splits array into chunks", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("hasContactInfo", () => {
  it("returns true when email exists", () => {
    expect(hasContactInfo({ email: "a@b.com", mobile_without_country_code: "" })).toBe(true);
  });

  it("returns true when mobile exists", () => {
    expect(hasContactInfo({ email: "", mobile_without_country_code: "9876543210" })).toBe(true);
  });

  it("returns false when neither exists", () => {
    expect(hasContactInfo({ email: "", mobile_without_country_code: "" })).toBe(false);
  });
});
