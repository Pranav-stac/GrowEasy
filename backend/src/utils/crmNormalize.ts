import type { CrmRecord } from "../types/crm.js";

const EMAIL_SPLIT = /[,;|\s]+/;
const PHONE_SPLIT = /[,;|/]+/;

export function isValidDateString(value: string): boolean {
  if (!value.trim()) return true;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export function normalizeCreatedAt(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function splitEmails(raw: string): string[] {
  return raw
    .split(EMAIL_SPLIT)
    .map((e) => e.trim())
    .filter((e) => e.includes("@"));
}

function splitPhones(raw: string): string[] {
  return raw
    .split(PHONE_SPLIT)
    .map((p) => p.replace(/\D/g, ""))
    .filter((p) => p.length >= 8);
}

function appendNote(existing: string, addition: string): string {
  const clean = addition.trim();
  if (!clean) return existing;
  return existing ? `${existing}\n${clean}` : clean;
}

function sanitizeNote(note: string): string {
  return note.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function normalizeCrmRecord(record: CrmRecord): CrmRecord {
  let email = record.email.trim();
  let mobile = record.mobile_without_country_code.trim();
  let note = sanitizeNote(record.crm_note);

  const emails = splitEmails(email);
  if (emails.length > 1) {
    email = emails[0];
    note = appendNote(note, `Additional emails: ${emails.slice(1).join(", ")}`);
  } else if (emails.length === 1) {
    email = emails[0];
  }

  const phones = splitPhones(mobile);
  if (phones.length > 1) {
    mobile = phones[0];
    note = appendNote(note, `Additional phones: ${phones.slice(1).join(", ")}`);
  } else if (phones.length === 1) {
    mobile = phones[0];
  }

  return {
    ...record,
    email,
    mobile_without_country_code: mobile,
    created_at: normalizeCreatedAt(record.created_at),
    crm_note: note,
  };
}
