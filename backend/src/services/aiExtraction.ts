import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import {
  type CrmRecord,
  type SkippedRecord,
  type TokenUsage,
  CRM_STATUSES,
  DATA_SOURCES,
} from "../types/crm.js";
import { chunkArray, hasContactInfo, normalizeRecord } from "../utils/spreadsheet.js";
import { normalizePhoneFields } from "../utils/phone.js";
import { normalizeCrmRecord } from "../utils/crmNormalize.js";
import {
  buildTokenUsage,
  estimateNaiveBaseline,
  extractTokenCount,
} from "../utils/tokens.js";
import {
  EXTRACTION_SYSTEM_PROMPT,
  MAPPING_ANALYSIS_PROMPT,
  MappingPlanSchema,
  type MappingPlan,
  buildExtractionUserPrompt,
  buildMappingAnalysisPrompt,
} from "./prompts.js";

const CrmRecordSchema = z.object({
  created_at: z.string(),
  name: z.string(),
  email: z.string(),
  country_code: z.string(),
  mobile_without_country_code: z.string(),
  company: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  lead_owner: z.string(),
  crm_status: z.enum(CRM_STATUSES).or(z.literal("")),
  crm_note: z.string(),
  data_source: z.enum(DATA_SOURCES).or(z.literal("")),
  possession_time: z.string(),
  description: z.string(),
});

const ExtractionResponseSchema = z.object({
  records: z.array(CrmRecordSchema),
});

export interface ExtractionResult {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  token_usage: TokenUsage;
}

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

function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

export class AiExtractionService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private batchSize: number;
  private maxRetries: number;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
    this.batchSize = Number(process.env.BATCH_SIZE ?? 15);
    this.maxRetries = Number(process.env.MAX_RETRIES ?? 3);
  }

  async extractRecords(
    rows: Record<string, string>[],
    onProgress?: (processed: number, total: number, tokens?: TokenUsage) => void
  ): Promise<ExtractionResult> {
    if (rows.length === 0) {
      return {
        imported: [],
        skipped: [],
        token_usage: { tokens_used: 0, baseline_tokens: 0, tokens_saved: 0 },
      };
    }

    const headers = Object.keys(rows[0]);
    const sampleRows = rows.slice(0, 2);
    const baselineRaw = estimateNaiveBaseline(rows, headers, this.batchSize);

    let totalTokens = 0;
    onProgress?.(0, rows.length);

    const { plan: mappingPlan, tokens: mappingTokens } =
      await this.detectColumnMapping(headers, sampleRows);
    totalTokens += mappingTokens;

    const batches = chunkArray(rows, this.batchSize);
    const imported: CrmRecord[] = [];
    const skipped: SkippedRecord[] = [];
    let processed = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const startIndex = batchIdx * this.batchSize;

      try {
        const { records, tokens } = await this.extractBatchWithRetry(
          headers,
          batch,
          mappingPlan
        );
        totalTokens += tokens;

        for (let i = 0; i < batch.length; i++) {
          const rawRow = batch[i];
          const extracted = normalizeCrmRecord(
            normalizePhoneFields(records[i] ?? emptyCrmRecord())
          );

          if (hasContactInfo(extracted)) {
            imported.push(extracted);
          } else {
            skipped.push({
              row_index: startIndex + i + 1,
              raw_data: rawRow,
              reason: "Record has neither email nor mobile number",
            });
          }
        }
      } catch (error) {
        for (let i = 0; i < batch.length; i++) {
          skipped.push({
            row_index: startIndex + i + 1,
            raw_data: batch[i],
            reason: `AI extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      }

      processed += batch.length;
      const token_usage = buildTokenUsage(totalTokens, baselineRaw);
      onProgress?.(processed, rows.length, token_usage);
    }

    return {
      imported,
      skipped,
      token_usage: buildTokenUsage(totalTokens, baselineRaw),
    };
  }

  private async detectColumnMapping(
    headers: string[],
    sampleRows: Record<string, string>[]
  ): Promise<{ plan: MappingPlan; tokens: number }> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: MAPPING_ANALYSIS_PROMPT,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await model.generateContent(
          buildMappingAnalysisPrompt(headers, sampleRows)
        );
        const content = result.response.text();
        if (!content) throw new Error("Empty mapping response from Gemini");

        const tokens = extractTokenCount(result.response.usageMetadata);
        const parsed = parseGeminiJson(content);
        return { plan: MappingPlanSchema.parse(parsed), tokens };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    throw lastError ?? new Error("Column mapping detection failed");
  }

  private async extractBatchWithRetry(
    headers: string[],
    rows: Record<string, string>[],
    mappingPlan: MappingPlan
  ): Promise<{ records: CrmRecord[]; tokens: number }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.extractBatch(headers, rows, mappingPlan);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    throw lastError ?? new Error("AI extraction failed after retries");
  }

  private async extractBatch(
    headers: string[],
    rows: Record<string, string>[],
    mappingPlan: MappingPlan
  ): Promise<{ records: CrmRecord[]; tokens: number }> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(
      buildExtractionUserPrompt(headers, rows, mappingPlan)
    );

    const content = result.response.text();
    if (!content) throw new Error("Empty response from Gemini");

    const tokens = extractTokenCount(result.response.usageMetadata);
    const parsed = parseGeminiJson(content);
    const validated = ExtractionResponseSchema.parse(parsed);

    if (validated.records.length !== rows.length) {
      throw new Error(`Expected ${rows.length} records, got ${validated.records.length}`);
    }

    const records = validated.records.map((r) =>
      normalizeCrmRecord(
        normalizePhoneFields(normalizeRecord(r) as unknown as CrmRecord)
      )
    );

    return { records, tokens };
  }
}

let serviceInstance: AiExtractionService | null = null;

export function getAiService(): AiExtractionService {
  if (!serviceInstance) {
    serviceInstance = new AiExtractionService();
  }
  return serviceInstance;
}
