export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];

export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  row_index: number;
  raw_data: Record<string, string>;
  reason: string;
}

export interface TokenUsage {
  tokens_used: number;
  baseline_tokens: number;
  tokens_saved: number;
}

export interface ImportResult {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  total_imported: number;
  total_skipped: number;
  total_rows: number;
  token_usage?: TokenUsage;
}

export interface CsvPreviewData {
  filename: string;
  size: number;
  headers: string[];
  rows: Record<string, string>[];
  preview_rows: Record<string, string>[];
  total_rows: number;
}

export type ImportStep = "upload" | "preview" | "processing" | "results";

export const STATUS_LABELS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "Good Lead",
  DID_NOT_CONNECT: "Not Dialed",
  BAD_LEAD: "Bad Lead",
  SALE_DONE: "Sale Done",
};

export const STATUS_COLORS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  DID_NOT_CONNECT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  BAD_LEAD: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  SALE_DONE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};
