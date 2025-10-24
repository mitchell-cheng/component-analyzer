"use client";

import { AnalyzerForm } from "@/components/AnalyzerForm";
import { CodemodPanel } from "@/components/CodemodPanel";
import { ResultsTable } from "@/components/ResultsTable";
import { Separator } from "@/components/ui/separator";
import type { AnalysisResult } from "@/lib/analyzer/types";
import { useState } from "react";

export default function Page() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [basePath, setBasePath] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [lastInclude, setLastInclude] = useState<string[] | undefined>(
    undefined
  );
  const [lastExclude, setLastExclude] = useState<string[] | undefined>(
    undefined
  );

  async function onAnalyze(
    projectPath: string,
    libraryName: string,
    includePatterns?: string[],
    excludePatterns?: string[]
  ) {
    setBusy(true);
    setError(null);
    setResult(null);
    setBasePath(projectPath);
    setLastInclude(includePatterns);
    setLastExclude(excludePatterns);

    try {
      setProgress("Scanning files…");
      const prevRes = await fetch("/api/analyze/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath, includePatterns, excludePatterns }),
      });
      const prevJson = await prevRes.json();
      if (!prevRes.ok) {
        setError(prevJson?.error ?? "Preview failed");
        setBusy(false);
        setProgress(null);
        return;
      }

      const count = prevJson.count as number;
      setProgress(`Analyzing ${count} files…`);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectPath,
          libraryName,
          includePatterns,
          excludePatterns,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Request failed");
      } else {
        setResult(json as AnalysisResult);
      }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <main className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Component Analyzer</h1>
      <p className="text-sm text-muted-foreground">
        Analyze JSX component usage from a specific UI library within a local
        project.
      </p>
      <AnalyzerForm onAnalyze={onAnalyze} busy={busy} />
      <Separator />
      {progress && (
        <div className="text-sm text-muted-foreground">{progress}</div>
      )}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {result && (
        <ResultsTable result={result} basePath={basePath ?? undefined} />
      )}
      {result && basePath && (
        <CodemodPanel
          projectPath={basePath}
          oldLib={result.libraryName}
          includePatterns={lastInclude}
          excludePatterns={lastExclude}
        />
      )}
    </main>
  );
}
