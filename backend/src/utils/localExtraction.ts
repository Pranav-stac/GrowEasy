import type { CrmRecord, CrmField } from "../types/crm.js";
import { CRM_FIELDS, CRM_STATUSES, DATA_SOURCES } from "../types/crm.js";
import type { MappingPlan } from "../services/prompts.js";
import { normalizeCrmRecord } from "./crmNormalize.js";
import { normalizePhoneFields } from "./phone.js";

const JOIN_WITH_SPACE: CrmField[] = ["name"];
const JOIN_WITH_NEWLINE: CrmField[] = ["crm_note", "description"];

function emptyCrmRecord(): CrmRecord {
  return {
    created_at: "",
    name: "",
    email: "",
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
}

function normalizeCrmFieldName(field: string): CrmField | null {
  const key = field.trim().toLowerCase().replace(/\s+/g, "_");
  const match = CRM_FIELDS.find((f) => f === key || f.replace(/_/g, "") === key.replace(/_/g, ""));
  return match ?? null;
}

function normalizeCrmStatus(value: string): CrmRecord["crm_status"] {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
  if ((CRM_STATUSES as readonly string[]).includes(upper)) {
    return upper as CrmRecord["crm_status"];
  }

  if (/GOOD|FOLLOW/i.test(trimmed)) return "GOOD_LEAD_FOLLOW_UP";
  if (/DID_NOT|NO_?CONNECT|NOT_?CONNECT/i.test(trimmed)) return "DID_NOT_CONNECT";
  if (/BAD/i.test(trimmed)) return "BAD_LEAD";
  if (/SALE|DONE|CLOSED/i.test(trimmed)) return "SALE_DONE";

  return "";
}

function normalizeDataSource(value: string): CrmRecord["data_source"] {
  const trimmed = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!trimmed) return "";

  const match = DATA_SOURCES.find((s) => s === trimmed || s.includes(trimmed) || trimmed.includes(s));
  return match ?? "";
}

function joinFieldValues(field: CrmField, values: string[]): string {
  if (values.length === 0) return "";
  if (JOIN_WITH_SPACE.includes(field)) return values.join(" ").trim();
  if (JOIN_WITH_NEWLINE.includes(field)) return values.join("\n").trim();
  return values[0];
}

function appendNote(note: string, addition: string): string {
  const clean = addition.trim();
  if (!clean) return note;
  return note ? `${note}\n${clean}` : clean;
}

export function applyMappingToRow(
  row: Record<string, string>,
  plan: MappingPlan,
  headers: string[]
): CrmRecord {
  const record = emptyCrmRecord();
  const fieldBuckets = new Map<CrmField, string[]>();
  let extraNote = "";

  for (const mapping of plan.column_mappings) {
    const raw = (row[mapping.csv_column] ?? "").trim();
    if (!raw) continue;

    const crmField = normalizeCrmFieldName(mapping.crm_field);
    if (!crmField) {
      extraNote = appendNote(extraNote, `${mapping.csv_column}: ${raw}`);
      continue;
    }

    const bucket = fieldBuckets.get(crmField) ?? [];
    bucket.push(raw);
    fieldBuckets.set(crmField, bucket);
  }

  const mappedColumns = new Set(plan.column_mappings.map((m) => m.csv_column));
  const unmapped = new Set([
    ...(plan.unmapped_columns ?? []),
    ...headers.filter((h) => !mappedColumns.has(h)),
  ]);

  for (const col of unmapped) {
    const raw = (row[col] ?? "").trim();
    if (raw) extraNote = appendNote(extraNote, `${col}: ${raw}`);
  }

  for (const field of CRM_FIELDS) {
    const values = fieldBuckets.get(field);
    if (!values?.length) continue;

    const joined = joinFieldValues(field, values);
    if (field === "crm_status") {
      record.crm_status = normalizeCrmStatus(joined);
    } else if (field === "data_source") {
      record.data_source = normalizeDataSource(joined);
    } else {
      record[field] = joined;
    }
  }

  if (extraNote) {
    record.crm_note = appendNote(record.crm_note, extraNote);
  }

  return normalizeCrmRecord(normalizePhoneFields(record));
}

export function applyMappingToRows(
  rows: Record<string, string>[],
  plan: MappingPlan,
  onRow?: (processed: number, total: number) => void
): CrmRecord[] {
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const records: CrmRecord[] = [];
  const reportEvery = rows.length <= 100 ? 1 : Math.max(10, Math.floor(rows.length / 20));

  for (let i = 0; i < rows.length; i++) {
    records.push(applyMappingToRow(rows[i], plan, headers));
    if (onRow && (i === rows.length - 1 || (i + 1) % reportEvery === 0)) {
      onRow(i + 1, rows.length);
    }
  }

  return records;
}
