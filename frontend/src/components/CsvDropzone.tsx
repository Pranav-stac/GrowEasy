"use client";

import { useCallback, useRef, useState } from "react";
import { ACCEPT_STRING, isSupportedFile, SUPPORTED_FORMATS_LABEL } from "@/lib/fileTypes";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024;

export function CsvDropzone({ onFileSelect, disabled }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);
      if (!isSupportedFile(file.name)) {
        setError(`Supported formats: ${SUPPORTED_FORMATS_LABEL}`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File size must be under 5MB");
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [disabled, validateAndSelect]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
          dragOver
            ? "border-[var(--accent)] bg-[var(--accent-light)]/30"
            : "border-gray-300 hover:border-gray-400 dark:border-gray-600"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <svg className="h-6 w-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <p className="text-base font-medium">Drop your file here</p>
        <p className="mt-1 text-sm text-[var(--muted)]">CSV, Excel, TSV — or click to browse</p>
        <span className="mt-4 rounded-full bg-gray-100 px-3 py-1 text-xs text-[var(--muted)] dark:bg-gray-800">
          {SUPPORTED_FORMATS_LABEL}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) validateAndSelect(file);
        }}
      />

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
