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

export const MAPPING_ANALYSIS_PROMPT = `Read CSV headers + 2 sample rows. Map each column to a CRM field from: ${CRM_FIELDS.join(", ")}. Infer from header names AND cell values. JSON only: {"detected_format":"...","column_mappings":[{"csv_column":"","crm_field":""}],"unmapped_columns":[]}`;

export const EXTRACTION_SYSTEM_PROMPT = `Apply column map to row arrays. JSON: {records:[{${CRM_FIELDS.join(",")}}]}. crm_status: ${CRM_STATUSES.join("|")}|"". data_source: ${DATA_SOURCES.join("|")}|"". mobile=digits only. country_code=+prefix. missing=""`;

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
