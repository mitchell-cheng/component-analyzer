"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ComponentInstance } from "@/lib/analyzer/types";

export function InstancesAccordion({
  instances,
}: {
  instances: ComponentInstance[];
}) {
  // Group instances by file and collapse by default
  const byFile = new Map<string, ComponentInstance[]>();
  for (const inst of instances) {
    const arr = byFile.get(inst.file) ?? [];
    arr.push(inst);
    byFile.set(inst.file, arr);
  }

  const entries = Array.from(byFile.entries())
    .map(
      ([file, list]) => [file, list.sort((a, b) => a.line - b.line)] as const
    )
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Accordion type="multiple" collapsible className="w-full">
      {entries.map(([file, list]) => (
        <AccordionItem key={file} value={file}>
          <AccordionTrigger>
            <span className="text-left">
              {file} • {list.length} usage{list.length === 1 ? "" : "s"}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {list.map((inst, idx) => (
                <div
                  key={`${inst.file}-${inst.line}-${idx}`}
                  className="space-y-1"
                >
                  <div className="text-sm">
                    Line {inst.line}
                    {inst.endLine && inst.endLine !== inst.line
                      ? `-${inst.endLine}`
                      : ""}{" "}
                    • {inst.importType}
                  </div>
                  <div>
                    <span className="font-medium">Parent:</span>{" "}
                    {inst.parentComponent ?? "—"}
                  </div>
                  <div className="font-medium">Props:</div>
                  <ul className="list-disc ml-6">
                    {inst.props.length === 0 && <li>None</li>}
                    {inst.props.map((p, i) => (
                      <li key={i}>
                        <span className="font-medium">{p.name}</span> (
                        {p.valueType})
                        {p.valuePreview ? `: ${p.valuePreview}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
