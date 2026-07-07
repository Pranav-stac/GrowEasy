"use client";

import { useCallback, useState } from "react";
import { CsvDropzone } from "./CsvDropzone";
import { DataTable } from "./DataTable";
import { ProgressBar } from "./ProgressBar";
import { downloadTemplate, extractLeads, parseFileClient } from "@/lib/api";
import { TokenUsageBadge } from "./TokenUsageBadge";
import type { CsvPreviewData, ImportResult, ImportStep, TokenUsage } from "@/types/crm";
import { CRM_FIELDS } from "@/types/crm";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: (result: ImportResult) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function ImportModal({ open, onClose, onImportComplete }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [downloading, setDownloading] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setProgress({ processed: 0, total: 0 });
    setTokenUsage(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = async (selected: File) => {
    setError(null);
    setFile(selected);
    try {
      const data = await parseFileClient(selected);
      setPreview(data);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse CSV");
      setFile(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setStep("upload");
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setStep("processing");
    setError(null);
    setTokenUsage(null);

    try {
      const importResult = await extractLeads(file, (processed, total, tokens) => {
        setProgress({ processed, total });
        if (tokens) setTokenUsage(tokens);
      });
      setResult(importResult);
      setStep("results");
      onImportComplete?.(importResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("preview");
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await downloadTemplate();
    } catch {
      setError("Failed to download template");
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[var(--card)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">Import Leads</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Upload CSV, Excel, or TSV — AI maps columns to CRM fields on confirm.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {step === "upload" && (
            <>
              <CsvDropzone onFileSelect={handleFileSelect} />
              <div className="mt-6 rounded-xl border border-[var(--border)] bg-gray-50/50 p-4 dark:bg-gray-800/30">
                <p className="text-sm font-medium">Works with any column layout</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                  Gemini reads headers + first 2 rows to detect column mapping, then extracts all records.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--accent-light)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:opacity-90 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloading ? "Downloading..." : "Download Sample CSV Template"}
                </button>
              </div>
            </>
          )}

          {step === "preview" && preview && file && (
            <>
              <div className="mb-4 flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <svg className="h-5 w-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-[var(--muted)]">{formatFileSize(file.size)} · {preview.total_rows} rows</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Remove file"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="mb-3 text-sm text-[var(--muted)]">
                Raw CSV preview — {preview.total_rows} rows, {preview.headers.length} columns. AI mapping runs on confirm.
              </p>
              <DataTable headers={preview.headers} rows={preview.preview_rows} maxHeight="280px" />
            </>
          )}

          {step === "processing" && (
            <div className="space-y-4 py-4">
              <ProgressBar
                processed={progress.processed}
                total={progress.total || preview?.total_rows || 0}
                message="Reading sample rows and mapping columns..."
              />
              {tokenUsage && <TokenUsageBadge usage={tokenUsage} />}
              <div className="flex justify-center pt-2">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--primary)] border-t-transparent" />
              </div>
            </div>
          )}

          {step === "results" && result && (
            <div className="space-y-5">
              {result.token_usage && (
                <TokenUsageBadge usage={result.token_usage} />
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{result.total_imported}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Imported</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{result.total_skipped}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Skipped</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-gray-50 p-4 text-center dark:bg-gray-800/30">
                  <p className="text-2xl font-bold">{result.total_rows}</p>
                  <p className="text-xs text-[var(--muted)]">Total Rows</p>
                </div>
              </div>

              {result.imported.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Successfully Parsed Records</h3>
                  <DataTable
                    headers={[...CRM_FIELDS]}
                    rows={result.imported.map((r) => ({ ...r }))}
                    maxHeight="240px"
                  />
                </div>
              )}

              {result.skipped.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    Skipped Records
                  </h3>
                  <DataTable
                    headers={["row_index", "reason", ...Object.keys(result.skipped[0]?.raw_data ?? {})]}
                    rows={result.skipped.map((s) => ({
                      row_index: String(s.row_index),
                      reason: s.reason,
                      ...s.raw_data,
                    }))}
                    maxHeight="200px"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          {step === "results" ? (
            <>
              <button
                onClick={reset}
                className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                Import Another
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={step === "processing"}
                className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800/50"
              >
                Cancel
              </button>
              {step === "preview" && (
                <button
                  onClick={handleConfirmImport}
                  className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
                >
                  Confirm Import
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
