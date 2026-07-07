import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import type { CsvPreviewResult } from "../types/crm.js";
import { getFileExtension } from "./fileTypes.js";

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().replace("T", " ").slice(0, 19);
  return String(value).trim();
}

function recordsToResult(records: Record<string, unknown>[]): CsvPreviewResult {
  if (records.length === 0) {
    return { headers: [], rows: [], total_rows: 0 };
  }

  const rows = records.map((record) => {
    const row: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      row[String(key).trim()] = cellToString(value);
    }
    return row;
  });

  const headers = Object.keys(rows[0]);
  return { headers, rows, total_rows: rows.length };
}

function parseDelimitedText(text: string, delimiter?: string): CsvPreviewResult {
  const clean = text.replace(/^\uFEFF/, "");
  const resolvedDelimiter =
    delimiter ?? (clean.includes("\t") && !clean.includes(",") ? "\t" : ",");

  const records = parse(clean, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    delimiter: resolvedDelimiter,
  }) as Record<string, string>[];

  if (records.length === 0) {
    const headerOnly = parse(clean, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      to_line: 1,
      delimiter: resolvedDelimiter,
    }) as string[][];

    return { headers: headerOnly[0] ?? [], rows: [], total_rows: 0 };
  }

  const rows = records.map((r) => {
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      row[k] = cellToString(v);
    }
    return row;
  });

  return { headers: Object.keys(rows[0]), rows, total_rows: rows.length };
}

function parseExcelBuffer(buffer: Buffer): CsvPreviewResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], total_rows: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return recordsToResult(records);
}

export function parseCsvBuffer(buffer: Buffer): CsvPreviewResult {
  return parseDelimitedText(buffer.toString("utf-8"));
}

export function parseFileBuffer(buffer: Buffer, filename: string): CsvPreviewResult {
  const ext = getFileExtension(filename);

  switch (ext) {
    case ".xlsx":
    case ".xls":
    case ".xlsm":
    case ".xlsb":
    case ".ods":
      return parseExcelBuffer(buffer);
    case ".tsv":
      return parseDelimitedText(buffer.toString("utf-8"), "\t");
    case ".txt":
      return parseDelimitedText(buffer.toString("utf-8"));
    case ".csv":
    default:
      return parseCsvBuffer(buffer);
  }
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function hasContactInfo(
  record: Partial<{ email: string; mobile_without_country_code: string }>
): boolean {
  const email = (record.email ?? "").trim();
  const mobile = (record.mobile_without_country_code ?? "").trim();
  return email.length > 0 || mobile.length > 0;
}

export function normalizeRecord(record: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    normalized[key] = cellToString(value);
  }
  return normalized;
}
