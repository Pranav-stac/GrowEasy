import { z } from "zod";
import { CRM_FIELDS, CRM_STATUSES, DATA_SOURCES } from "../types/crm.js";
import { rowsToArrays, truncateRows } from "../utils/tokens.js";

export const MappingPlanSchema = z.object({
  detected_format: z.string(),
  column_mappings: z.array(
    z.object({
      csv_column: z.string(),
      crm_field: z.string(),
      notes: z.string().optional(),
    })
  ),
  unmapped_columns: z.array(z.string()).optional(),
});

export type MappingPlan = z.infer<typeof MappingPlanSchema>;

export const MAPPING_ANALYSIS_PROMPT = `Map CSV columns to GrowEasy CRM fields using headers + 2 sample rows.
Fields: ${CRM_FIELDS.join(", ")}
Infer from header names AND cell values. Extra columns → crm_note or unmapped_columns.
JSON: {"detected_format":"","column_mappings":[{"csv_column":"","crm_field":""}],"unmapped_columns":[]}`;

export const EXTRACTION_SYSTEM_PROMPT = `Apply column map to row arrays. Return JSON {records:[...]}.
Fields: ${CRM_FIELDS.join(",")}
Rules:
- crm_status: ${CRM_STATUSES.join("|")} or ""
- data_source: ${DATA_SOURCES.join("|")} or ""
- created_at: must parse with new Date(); prefer YYYY-MM-DD HH:mm:ss
- country_code: +prefix; mobile_without_country_code: digits only
- multiple emails: first→email, rest→crm_note
- multiple phones: first→mobile, rest→crm_note
- crm_note: remarks, extras; use \\n for line breaks
- missing fields = ""`;

export function buildMappingAnalysisPrompt(
  headers: string[],
  sampleRows: Record<string, string>[]
): string {
  const truncated = truncateRows(sampleRows);
  return `h:${JSON.stringify(headers)} r:${JSON.stringify(rowsToArrays(headers, truncated))}`;
}

export function buildExtractionUserPrompt(
  headers: string[],
  rows: Record<string, string>[],
  mappingPlan: MappingPlan
): string {
  const map: Record<string, string> = {};
  for (const m of mappingPlan.column_mappings) {
    map[m.csv_column] = m.crm_field;
  }
  return `map:${JSON.stringify(map)} r:${JSON.stringify(rowsToArrays(headers, rows))}`;
}
