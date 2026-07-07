import * as XLSX from "xlsx";
import type { CsvPreviewData, ImportResult, TokenUsage } from "@/types/crm";
import { getFileExtension, isSupportedFile } from "./fileTypes";

/** Browser: same-origin (nginx proxies /api). SSR/build: env or local backend. */
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function downloadTemplate(): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/import/template`);
  if (!res.ok) throw new Error("Failed to download template");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "groweasy_leads_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportProgress {
  processed: number;
  total: number;
  message?: string;
  phase?: "mapping" | "extracting" | "complete";
  tokens?: TokenUsage;
}

export async function extractLeads(
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${getApiBase()}/api/import/extract/stream`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Import failed" }));
    throw new Error(err.error ?? "Import failed");
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return extractLeadsFallback(file);
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));

      if (data.type === "progress" && onProgress) {
        onProgress({
          processed: data.processed,
          total: data.total,
          message: data.message,
          phase: data.phase,
          tokens: data.token_usage,
        });
      } else if (data.type === "complete") {
        return data.result as ImportResult;
      } else if (data.type === "error") {
        throw new Error(data.message);
      }
    }
  }

  throw new Error("Stream ended without result");
}

async function extractLeadsFallback(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${getApiBase()}/api/import/extract`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Import failed" }));
    throw new Error(err.error ?? "Import failed");
  }

  return res.json();
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().replace("T", " ").slice(0, 19);
  return String(value).trim();
}

function recordsToPreview(
  filename: string,
  size: number,
  records: Record<string, unknown>[]
): CsvPreviewData {
  const rows = records.map((record) => {
    const row: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      row[String(key).trim()] = cellToString(value);
    }
    return row;
  });

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return {
    filename,
    size,
    headers,
    rows,
    preview_rows: rows.slice(0, 50),
    total_rows: rows.length,
  };
}

function parseCsvText(filename: string, size: number, text: string): CsvPreviewData {
  const clean = text.replace(/^\uFEFF/, "");
  const delimiter = clean.includes("\t") && !clean.includes(",") ? "\t" : ",";
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) throw new Error("File is empty");

  const headers = parseDelimitedLine(lines[0], delimiter);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseDelimitedLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return {
    filename,
    size,
    headers,
    rows,
    preview_rows: rows.slice(0, 50),
    total_rows: rows.length,
  };
}

function parseExcelBuffer(filename: string, size: number, buffer: ArrayBuffer): CsvPreviewData {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets");

  const sheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (records.length === 0) throw new Error("Excel sheet is empty");
  return recordsToPreview(filename, size, records);
}

export function parseFileClient(file: File): Promise<CsvPreviewData> {
  if (!isSupportedFile(file.name)) {
    return Promise.reject(new Error("Unsupported file type"));
  }

  const ext = getFileExtension(file.name);
  const isExcel = [".xlsx", ".xls", ".xlsm", ".xlsb", ".ods"].includes(ext);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        if (isExcel) {
          resolve(parseExcelBuffer(file.name, file.size, reader.result as ArrayBuffer));
        } else {
          resolve(parseCsvText(file.name, file.size, reader.result as string));
        }
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Failed to parse file"));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

/** @deprecated use parseFileClient */
export const parseCsvClient = parseFileClient;

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
