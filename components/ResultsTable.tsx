"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { AnalysisResult } from "@/lib/analyzer/types";
import { InstancesAccordion } from "./InstancesAccordion";

export function ResultsTable({
  result,
  basePath,
}: {
  result: AnalysisResult;
  basePath?: string;
}) {
  if (result.components.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No components from "{result.libraryName}" found.
      </div>
    );
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `component-analyzer-${result.libraryName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Scanned {result.scannedFiles} files, excluded {result.excludedFiles}.
          Took {result.durationMs} ms.
        </div>
        <button
          className="text-sm underline hover:opacity-80"
          onClick={downloadJson}
        >
          Download JSON
        </button>
      </div>
      <Accordion type="multiple" className="w-full">
        {result.components.map(({ summary, instances }) => (
          <AccordionItem key={summary.component} value={summary.component}>
            <AccordionTrigger>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium">{summary.component}</span>
                <Badge variant="secondary">
                  {summary.total} usage{summary.total === 1 ? "" : "s"}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  {Array.from(summary.importTypes).map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <Badge variant="default">
                    Max props per instance: {summary.maxPropsPerInstance}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium">
                    Props (union types):
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(summary.propStats).map(([name, stat]) => (
                      <Badge key={name} variant="secondary">
                        {name}: {Array.from(stat.valueTypes).join("|")}
                      </Badge>
                    ))}
                    {Object.keys(summary.propStats).length === 0 && (
                      <span>—</span>
                    )}
                  </div>
                </div>
                <InstancesAccordion instances={instances} basePath={basePath} />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
