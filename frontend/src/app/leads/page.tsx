"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import type { CrmRecord } from "@/types/crm";
import { STATUS_COLORS, STATUS_LABELS } from "@/types/crm";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatContact(record: CrmRecord): string {
  const code = record.country_code?.replace(/^\+?/, "") ?? "";
  const mobile = record.mobile_without_country_code ?? "";
  if (!mobile) return "—";
  return `+${code}${mobile}`;
}

function StatusBadge({ status }: { status: string }) {
  if (!status) return <span className="text-[var(--muted)]">—</span>;
  const label = STATUS_LABELS[status] ?? status;
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<CrmRecord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("importedLeads");
    if (stored) {
      try {
        setLeads(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const filtered = leads.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      lead.email.toLowerCase().includes(q) ||
      lead.mobile_without_country_code.includes(q) ||
      lead.name.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Manage Your Leads</h1>
          <p className="mt-1 text-[var(--muted)]">
            Monitor lead status, assign tasks, and close deals faster.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="font-semibold">Your Leads</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter email or phone number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 rounded-lg border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[var(--muted)]">No leads yet.</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Import leads from{" "}
                <a href="/lead-sources" className="text-[var(--accent)] underline">
                  Lead Sources
                </a>{" "}
                to see them here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["LEAD NAME", "EMAIL", "CONTACT", "DATE CREATED", "COMPANY", "STATUS"].map((h) => (
                      <th key={h} className="px-6 py-3 text-xs font-semibold tracking-wide text-[var(--muted)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-3.5 font-medium">{lead.name || "—"}</td>
                      <td className="px-6 py-3.5">{lead.email || "—"}</td>
                      <td className="px-6 py-3.5">{formatContact(lead)}</td>
                      <td className="px-6 py-3.5">{formatDate(lead.created_at)}</td>
                      <td className="px-6 py-3.5">{lead.company || "—"}</td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={lead.crm_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
