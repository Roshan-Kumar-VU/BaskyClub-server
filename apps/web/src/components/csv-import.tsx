"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, Notice, toast } from "./ui";

type Report = {
  total: number;
  valid: number;
  created: number;
  errors: { line: number; field: string; message: string }[];
  preview: Record<string, unknown>[];
};

/**
 * Bulk upload from a spreadsheet (Basky team): office bearers or Media / Legacy records.
 * The file is checked first (dry run) and shown; nothing is saved unless every row is fine.
 */
export function CsvImport({ orgId, kind, onDone }: { orgId: string; kind: "office-bearers" | "legacy"; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const path = `/api/associations/${orgId}/import/${kind}`;

  const send = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      if (dryRun) form.append("dryRun", "1");
      const r = await api<Report>("POST", path, form);
      if (dryRun) setReport(r);
      else {
        toast(`Imported ${r.created} ${r.created === 1 ? "row" : "rows"}`);
        setFile(null);
        setReport(null);
        onDone();
      }
    } catch (e) {
      toast("Couldn't read the file", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Upload a spreadsheet">
      <div className="space-y-3 p-4">
        <p className="text-[13px] text-muted">
          Fill the template in Excel or Google Sheets, save it as CSV and upload it. We check every row first; nothing is saved unless all rows are fine. Basky team only.
        </p>
        <a href={path} download className="inline-block text-sm font-bold text-accent-ink hover:underline">
          Download the CSV template
        </a>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setReport(null);
          }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-fill file:px-3 file:py-2 file:font-bold"
        />
        {file && !report && (
          <Button small loading={busy} onClick={() => send(true)}>
            Check the file
          </Button>
        )}
        {report && (
          <div className="space-y-3">
            <Notice tone={report.errors.length ? "error" : "success"}>
              {report.valid} of {report.total} rows are fine.{report.errors.length ? " Fix the rows below and upload again." : ""}
            </Notice>
            {report.errors.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {report.errors.map((e, i) => (
                  <li key={i}>
                    <b>Row {e.line}</b> · {e.field}: {e.message}
                  </li>
                ))}
              </ul>
            )}
            {report.preview.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-muted">
                      {Object.keys(report.preview[0]).map((k) => (
                        <th key={k} className="pr-3 font-semibold">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.preview.map((row, i) => (
                      <tr key={i} className="border-t border-line">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="py-1 pr-3">
                            {v === null ? "—" : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!report.errors.length && report.valid > 0 && (
              <Button loading={busy} onClick={() => send(false)}>
                Import {report.valid} {report.valid === 1 ? "row" : "rows"}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
