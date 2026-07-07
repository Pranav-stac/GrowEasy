import { Router, type Request, type Response } from "express";
import multer from "multer";
import { getAiService } from "../services/aiExtraction.js";
import { isSupportedFile, SUPPORTED_FORMATS_LABEL } from "../utils/fileTypes.js";
import { parseFileBuffer } from "../utils/spreadsheet.js";
import type { ImportResult } from "../types/crm.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isSupportedFile(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Supported: ${SUPPORTED_FORMATS_LABEL}`));
    }
  },
});

export const importRouter = Router();

function parseUploadedFile(file: Express.Multer.File) {
  return parseFileBuffer(file.buffer, file.originalname);
}

importRouter.post("/preview", upload.single("file"), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const preview = parseUploadedFile(req.file);

    if (preview.headers.length === 0) {
      res.status(400).json({ error: "File appears to be empty or invalid" });
      return;
    }

    res.json({
      filename: req.file.originalname,
      size: req.file.size,
      ...preview,
      preview_rows: preview.rows.slice(0, 50),
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to parse file",
    });
  }
});

importRouter.post("/extract", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { rows, total_rows } = parseUploadedFile(req.file);

    if (rows.length === 0) {
      res.status(400).json({ error: "File contains no data rows" });
      return;
    }

    const aiService = getAiService();
    const { imported, skipped, token_usage } = await aiService.extractRecords(rows);

    const result: ImportResult = {
      imported,
      skipped,
      total_imported: imported.length,
      total_skipped: skipped.length,
      total_rows,
      token_usage,
    };

    res.json(result);
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to process import",
    });
  }
});

importRouter.post("/extract/stream", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { rows, total_rows } = parseUploadedFile(req.file);

    if (rows.length === 0) {
      res.status(400).json({ error: "File contains no data rows" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const aiService = getAiService();
    const { imported, skipped, token_usage } = await aiService.extractRecords(
      rows,
      (processed, total, tokens) => {
        sendEvent({
          type: "progress",
          processed,
          total,
          message: `Processing ${processed} of ${total} rows...`,
          token_usage: tokens,
        });
      }
    );

    const result: ImportResult = {
      imported,
      skipped,
      total_imported: imported.length,
      total_skipped: skipped.length,
      total_rows,
      token_usage,
    };

    sendEvent({ type: "complete", result });
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process import";
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    res.end();
  }
});

importRouter.get("/template", (_req: Request, res: Response) => {
  const headers = [
    "created_at",
    "name",
    "email",
    "country_code",
    "mobile_without_country_code",
    "company",
    "city",
    "state",
    "country",
    "lead_owner",
    "crm_status",
    "crm_note",
    "data_source",
    "possession_time",
    "description",
  ];

  const sampleRows = [
    [
      "2026-05-13 14:20:48",
      "John Doe",
      "john.doe@example.com",
      "+91",
      "9876543210",
      "GrowEasy",
      "Mumbai",
      "Maharashtra",
      "India",
      "test@gmail.com",
      "GOOD_LEAD_FOLLOW_UP",
      "Client is asking to reschedule demo",
      "",
      "",
      "",
    ],
    [
      "2026-05-13 14:25:30",
      "Sarah Johnson",
      "sarah.johnson@example.com",
      "+91",
      "9876543211",
      "Tech Solutions",
      "Bangalore",
      "Karnataka",
      "India",
      "test@gmail.com",
      "DID_NOT_CONNECT",
      "Person was busy, will try again next week",
      "",
      "",
      "",
    ],
  ];

  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csv = [headers.join(","), ...sampleRows.map((row) => row.map(escape).join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="groweasy_leads_template.csv"');
  res.send(csv);
});
