"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ImportModal } from "@/components/ImportModal";
import type { CrmRecord, ImportResult } from "@/types/crm";

const supportedFormats = [
  {
    name: "Facebook Lead Export",
    columns: "full_name, created_time, phone_number, email, lead_status",
    file: "/samples/facebook_leads_export.csv",
  },
  {
    name: "Google Ads Export",
    columns: "First Name, Last Name, Conversion Time, Phone Number, Email",
    file: "/samples/google_ads_export.csv",
  },
  {
    name: "Real Estate CRM",
    columns: "Client Name, Enquiry Date, Mobile, Builder, Stage, Project",
    file: "/samples/real_estate_crm_export.csv",
  },
  {
    name: "Sales / Marketing CSV",
    columns: "contact, lead_date, phone, account, comments, campaign",
    file: "/samples/sales_report.csv",
  },
];

function saveImportedLeads(result: ImportResult) {
  const existing: CrmRecord[] = JSON.parse(sessionStorage.getItem("importedLeads") ?? "[]");
  sessionStorage.setItem("importedLeads", JSON.stringify([...existing, ...result.imported]));
}

export default function LeadSourcesPage() {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Lead Sources</h1>
          <p className="mt-1 max-w-2xl text-[var(--muted)]">
            Upload any file — CSV, Excel (.xlsx/.xls), TSV, or TXT. Gemini reads the first 2 rows to detect column mapping.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-light)]/20 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">AI CSV Importer</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                No fixed column names required. Gemini inspects headers and sample data first, then maps fields.
              </p>
            </div>
            <button
              onClick={() => setImportOpen(true)}
              className="shrink-0 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
            >
              Import CSV
            </button>
          </div>
        </div>

        <h2 className="mb-4 text-sm font-semibold tracking-wide text-[var(--muted)]">
          SUPPORTED FORMATS — TRY SAMPLE FILES
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {supportedFormats.map((fmt) => (
            <div
              key={fmt.name}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <h3 className="font-semibold">{fmt.name}</h3>
              <p className="mt-2 font-mono text-xs text-[var(--muted)]">{fmt.columns}</p>
              <a
                href={fmt.file}
                download
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Download sample CSV
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportComplete={saveImportedLeads}
      />
    </DashboardLayout>
  );
}
