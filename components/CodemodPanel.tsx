"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { html } from "diff2html";
import { useState } from "react";

export function CodemodPanel({
  projectPath,
  oldLib,
  includePatterns,
  excludePatterns,
}: {
  projectPath: string;
  oldLib: string;
  includePatterns?: string[];
  excludePatterns?: string[];
}) {
  const [newLib, setNewLib] = useState("antd");
  const [preserveSubpath, setPreserveSubpath] = useState(false);
  const [busy, setBusy] = useState(false);
  const [changedCount, setChangedCount] = useState(0);
  const [diffHtml, setDiffHtml] = useState<string | null>(null);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

  async function preview() {
    setBusy(true);
    setApplyMsg(null);
    try {
      const res = await fetch("/api/codemod/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectPath,
          libraryName: oldLib,
          newLib,
          includePatterns,
          excludePatterns,
          preserveSubpath,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Preview failed");
      }
      const diffs: Array<{ file: string; diff: string }> = json.diffs ?? [];
      const combined = diffs.map((d) => d.diff).join("\n");
      setChangedCount(json.changedCount ?? diffs.length ?? 0);

      // Use diff2html's html() renderer
      const htmlContent = html(combined, {
        inputFormat: "string",
        showFiles: true,
        matching: "lines",
      });
      setDiffHtml(htmlContent);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setDiffHtml(null);
      setChangedCount(0);
      setApplyMsg(msg ?? "Preview error");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    setBusy(true);
    setApplyMsg(null);
    try {
      const res = await fetch("/api/codemod/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectPath,
          libraryName: oldLib,
          newLib,
          includePatterns,
          excludePatterns,
          preserveSubpath,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Apply failed");
      }
      setApplyMsg(`Applied codemod. Changed ${json.changedCount} files.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setApplyMsg(msg ?? "Apply error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Separator />
      <div className="text-lg font-semibold">Codemod Imports</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">From Library</label>
          <Input value={oldLib} readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Library</label>
          <Input
            placeholder="e.g. antd"
            value={newLib}
            onChange={(e) => setNewLib(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 mt-6 md:mt-0">
          <input
            id="preserveSubpath"
            type="checkbox"
            checked={preserveSubpath}
            onChange={(e) => setPreserveSubpath(e.target.checked)}
          />
          <label htmlFor="preserveSubpath" className="text-sm">
            Preserve subpath (e.g., @mui/material to antd/material)
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <Button disabled={busy || !newLib} onClick={preview}>
          {busy ? "Working…" : "Preview Changes"}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || changedCount === 0}
          onClick={apply}
        >
          {busy ? "Working…" : "Apply Codemod"}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {changedCount > 0
          ? `Previewing diffs for ${changedCount} file(s).`
          : "No changes detected yet."}
      </div>
      {applyMsg && <div className="text-sm">{applyMsg}</div>}

      {diffHtml && (
        <div
          className="max-h-[480px] overflow-auto border rounded-md"
          dangerouslySetInnerHTML={{ __html: diffHtml }}
        />
      )}
    </div>
  );
}
