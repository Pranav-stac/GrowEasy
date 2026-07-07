export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
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

export type CrmStatus = (typeof CRM_STATUSES)[number];
export type DataSource = (typeof DATA_SOURCES)[number];
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
  crm_status: CrmStatus | "";
  crm_note: string;
  data_source: DataSource | "";
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

export interface CsvPreviewResult {
  headers: string[];
  rows: Record<string, string>[];
  total_rows: number;
}

export interface ImportProgressEvent {
  type: "progress" | "complete" | "error";
  processed?: number;
  total?: number;
  message?: string;
  result?: ImportResult;
}
