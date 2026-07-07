"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface DataTableProps {
  headers: string[];
  rows: Record<string, string>[];
  maxHeight?: string;
  virtualize?: boolean;
}

const ROW_HEIGHT = 40;
const VIRTUALIZE_THRESHOLD = 50;

function formatHeader(header: string): string {
  return header.replace(/_/g, " ").toUpperCase();
}

function CellValue({ value }: { value: string }) {
  if (!value) return <span className="text-[var(--muted)]">—</span>;
  return <>{value}</>;
}

function ClassicTable({
  headers,
  rows,
  maxHeight,
}: {
  headers: string[];
  rows: Record<string, string>[];
  maxHeight: string;
}) {
  return (
    <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ maxHeight }}>
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--card)]">
            {headers.map((header) => (
              <th
                key={header}
                className="sticky top-0 z-10 whitespace-nowrap bg-[var(--card)] px-4 py-3 text-xs font-semibold tracking-wide text-[var(--muted)]"
              >
                {formatHeader(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
            >
              {headers.map((header) => (
                <td key={header} className="whitespace-nowrap px-4 py-2.5">
                  <CellValue value={row[header] ?? ""} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VirtualizedTable({
  headers,
  rows,
  maxHeight,
}: {
  headers: string[];
  rows: Record<string, string>[];
  maxHeight: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const gridCols = `repeat(${headers.length}, minmax(120px, auto))`;

  return (
    <div className="rounded-lg border border-[var(--border)]">
      <div
        className="grid overflow-x-auto border-b border-[var(--border)] bg-[var(--card)]"
        style={{ gridTemplateColumns: gridCols }}
      >
        {headers.map((header) => (
          <div
            key={header}
            className="whitespace-nowrap px-4 py-3 text-xs font-semibold tracking-wide text-[var(--muted)]"
          >
            {formatHeader(header)}
          </div>
        ))}
      </div>

      <div ref={parentRef} className="overflow-auto" style={{ maxHeight }}>
        <div
          className="relative min-w-max"
          style={{ height: rowVirtualizer.getTotalSize() }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                className="absolute left-0 grid w-full border-b border-[var(--border)] hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: gridCols,
                }}
              >
                {headers.map((header) => (
                  <div
                    key={header}
                    className="flex items-center whitespace-nowrap px-4 text-sm"
                  >
                    <CellValue value={row[header] ?? ""} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
        {rows.length.toLocaleString()} rows · virtualized scrolling
      </p>
    </div>
  );
}

export function DataTable({
  headers,
  rows,
  maxHeight = "320px",
  virtualize,
}: DataTableProps) {
  if (headers.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
        No data to display
      </div>
    );
  }

  const useVirtual = virtualize ?? rows.length > VIRTUALIZE_THRESHOLD;

  if (useVirtual) {
    return <VirtualizedTable headers={headers} rows={rows} maxHeight={maxHeight} />;
  }

  return <ClassicTable headers={headers} rows={rows} maxHeight={maxHeight} />;
}
