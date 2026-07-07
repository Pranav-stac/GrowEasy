import { z } from "zod";
import { CRM_FIELDS } from "../types/crm.js";
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

export const MAPPING_ANALYSIS_PROMPT = `Map CSV columns to GrowEasy CRM fields using headers + 2 sample rows only.
Fields: ${CRM_FIELDS.join(", ")}
Infer from header names AND cell values. Extra columns → crm_note or unmapped_columns.
Return JSON only: {"detected_format":"","column_mappings":[{"csv_column":"","crm_field":""}],"unmapped_columns":[]}`;

export function buildMappingAnalysisPrompt(
  headers: string[],
  sampleRows: Record<string, string>[]
): string {  const truncated = truncateRows(sampleRows);
  return `h:${JSON.stringify(headers)} r:${JSON.stringify(rowsToArrays(headers, truncated))}`;
}