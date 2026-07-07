export const SUPPORTED_EXTENSIONS = [
  ".csv",
  ".tsv",
  ".txt",
  ".xlsx",
  ".xls",
  ".xlsm",
  ".xlsb",
  ".ods",
] as const;

export const ACCEPT_STRING = SUPPORTED_EXTENSIONS.join(",");

export const SUPPORTED_MIME_TYPES = [
  "text/csv",
  "text/tab-separated-values",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/octet-stream",
];

export function getFileExtension(filename: string): string {
  const lower = filename.toLowerCase();
  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx) : "";
}

export function isSupportedFile(filename: string, mimetype?: string): boolean {
  const ext = getFileExtension(filename);
  if (SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
    return true;
  }
  if (mimetype && SUPPORTED_MIME_TYPES.includes(mimetype)) {
    return true;
  }
  return false;
}

export const SUPPORTED_FORMATS_LABEL =
  ".csv, .tsv, .txt, .xlsx, .xls, .xlsm, .ods (max 5MB)";
