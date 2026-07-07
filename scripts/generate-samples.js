const path = require("path");
const XLSX = require(path.join(__dirname, "..", "backend", "node_modules", "xlsx"));
const fs = require("fs");

const samples = [
  {
    name: "facebook_leads_export.xlsx",
    rows: [
      {
        id: "l_1001",
        created_time: "2026-06-29 10:00:00",
        full_name: "Rahil Sharma",
        email: "rahil@test.com",
        phone_number: "917894561177",
        company_name: "Acme Corp",
        city: "Mumbai",
        lead_status: "Interested",
      },
      {
        id: "l_1002",
        created_time: "2026-06-29 10:15:00",
        full_name: "Priya Nair",
        email: "",
        phone_number: "918765432100",
        company_name: "TechFlow",
        city: "Bangalore",
        lead_status: "New Lead",
      },
    ],
  },
];

for (const sample of samples) {
  const ws = XLSX.utils.json_to_sheet(sample.rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");

  const outDir = path.join(__dirname, "..", "samples");
  const publicDir = path.join(__dirname, "..", "frontend", "public", "samples");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  fs.writeFileSync(path.join(outDir, sample.name), buffer);
  fs.writeFileSync(path.join(publicDir, sample.name), buffer);
  console.log("Created", sample.name);
}
