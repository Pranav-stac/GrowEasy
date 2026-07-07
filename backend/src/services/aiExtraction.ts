import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import {
  type CrmRecord,
  type SkippedRecord,
  type TokenUsage,
} from "../types/crm.js";
import { hasContactInfo } from "../utils/spreadsheet.js";
import { applyMappingToRows } from "../utils/localExtraction.js";
import {
  buildTokenUsage,
  estimateNaiveBaseline,
  extractTokenCount,
} from "../utils/tokens.js";
import {
  MAPPING_ANALYSIS_PROMPT,
  MappingPlanSchema,
  type MappingPlan,
  buildMappingAnalysisPrompt,
} from "./prompts.js";

export interface ExtractionProgress {
  processed: number;
  total: number;
  phase: "mapping" | "extracting" | "complete";
  message: string;
  token_usage?: TokenUsage;
}

export interface ExtractionResult {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  token_usage: TokenUsage;
}

function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

function fastGenerationConfig(): GenerationConfig {
  return {
    temperature: 0.1,
    responseMimeType: "application/json",
    // @ts-expect-error SDK supports thinkingBudget for 2.5 flash
    thinkingConfig: { thinkingBudget: 0 },
  };
}

function splitImportedSkipped(
  rows: Record<string, string>[],
  records: CrmRecord[]
): { imported: CrmRecord[]; skipped: SkippedRecord[] } {
  const imported: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  for (let i = 0; i < rows.length; i++) {
    const record = records[i];
    if (hasContactInfo(record)) {
      imported.push(record);
    } else {
      skipped.push({
        row_index: i + 1,
        raw_data: rows[i],
        reason: "Record has neither email nor mobile number",
      });
    }
  }

  return { imported, skipped };
}

export class AiExtractionService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private maxRetries: number;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    this.maxRetries = Number(process.env.MAX_RETRIES ?? 3);
  }

  /**
   * AI maps columns (headers + 2 sample rows only).
   * All row transformation runs locally — no per-row Gemini calls.
   */
  async extractRecords(
    rows: Record<string, string>[],
    onProgress?: (progress: ExtractionProgress) => void
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
    const baselineRaw = estimateNaiveBaseline(rows, headers, 15);
    let totalTokens = 0;

    const report = (progress: ExtractionProgress) => {
      onProgress?.({
        ...progress,
        token_usage: progress.token_usage ?? buildTokenUsage(totalTokens, baselineRaw),
      });
    };

    report({
      processed: 0,
      total: rows.length,
      phase: "mapping",
      message: "AI mapping columns (headers + 2 sample rows)…",
    });

    const { plan: mappingPlan, tokens: mappingTokens } =
      await this.detectColumnMapping(headers, sampleRows);
    totalTokens += mappingTokens;

    report({
      processed: 0,
      total: rows.length,
      phase: "extracting",
      message: "Applying column map to all rows…",
      token_usage: buildTokenUsage(totalTokens, baselineRaw),
    });

    const records = applyMappingToRows(rows, mappingPlan, (processed, total) => {
      report({
        processed,
        total,
        phase: "extracting",
        message: `Transforming row ${processed} of ${total}…`,
        token_usage: buildTokenUsage(totalTokens, baselineRaw),
      });
    });

    const { imported, skipped } = splitImportedSkipped(rows, records);
    const token_usage = buildTokenUsage(totalTokens, baselineRaw);

    report({
      processed: rows.length,
      total: rows.length,
      phase: "complete",
      message: `Done — ${imported.length} imported`,
      token_usage,
    });

    return { imported, skipped, token_usage };
  }

  private async detectColumnMapping(
    headers: string[],
    sampleRows: Record<string, string>[]
  ): Promise<{ plan: MappingPlan; tokens: number }> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: MAPPING_ANALYSIS_PROMPT,
      generationConfig: fastGenerationConfig(),
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
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }

    throw lastError ?? new Error("Column mapping detection failed");
  }
}

let serviceInstance: AiExtractionService | null = null;

export function getAiService(): AiExtractionService {
  if (!serviceInstance) {
    serviceInstance = new AiExtractionService();
  }
  return serviceInstance;
}
