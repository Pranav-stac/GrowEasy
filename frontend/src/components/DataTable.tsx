interface DataTableProps {
  headers: string[];
  rows: Record<string, string>[];
  maxHeight?: string;
}

function formatHeader(header: string): string {
  return header.replace(/_/g, " ").toUpperCase();
}

export function DataTable({ headers, rows, maxHeight = "320px" }: DataTableProps) {
  if (headers.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
        No data to display
      </div>
    );
  }

  return (
    <div
      className="overflow-auto rounded-lg border border-[var(--border)]"
      style={{ maxHeight }}
    >
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
                <td key={header} className="whitespace-nowrap px-4 py-2.5 text-[var(--foreground)]">
                  {row[header] || <span className="text-[var(--muted)]">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
