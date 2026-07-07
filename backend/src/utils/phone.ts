import type { CrmRecord } from "../types/crm.js";

const COUNTRY_CODES = ["91", "1", "44", "61", "971", "65"];

export function normalizePhoneFields(record: CrmRecord): CrmRecord {
  let mobile = record.mobile_without_country_code.replace(/\D/g, "");
  let countryCode = record.country_code.replace(/\s/g, "");

  if (!mobile && record.email === "") {
    const notePhones = record.crm_note.match(/\d{10,}/g);
    if (notePhones?.[0]) mobile = notePhones[0];
  }

  if (mobile.length > 10) {
    for (const code of COUNTRY_CODES) {
      if (mobile.startsWith(code) && mobile.length > code.length + 8) {
        if (!countryCode) countryCode = `+${code}`;
        mobile = mobile.slice(code.length);
        break;
      }
    }
  }

  if (!countryCode && mobile.length === 10) {
    countryCode = "+91";
  }

  if (countryCode && !countryCode.startsWith("+")) {
    countryCode = `+${countryCode}`;
  }

  return {
    ...record,
    country_code: countryCode,
    mobile_without_country_code: mobile,
  };
}
