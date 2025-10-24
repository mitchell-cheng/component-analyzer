'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { AnalyzerForm } from '@/components/AnalyzerForm';
import { ResultsTable } from '@/components/ResultsTable';
import type { AnalysisResult } from '@/lib/analyzer/types';

export default function Page() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onAnalyze(projectPath: string, libraryName: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, libraryName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'Request failed');
      } else {
        setResult(json as AnalysisResult);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Component Analyzer</h1>
      <p className="text-sm text-muted-foreground">
        Analyze JSX component usage from a specific UI library within a local project.
      </p>
      <AnalyzerForm onAnalyze={onAnalyze} busy={busy} />
      <Separator />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {result && <ResultsTable result={result} />}
    </main>
  );
}
