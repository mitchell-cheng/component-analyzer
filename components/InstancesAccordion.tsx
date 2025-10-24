'use client';

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import type { ComponentInstance } from '@/lib/analyzer/types';

export function InstancesAccordion({ instances }: { instances: ComponentInstance[] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {instances.map((inst, idx) => (
        <AccordionItem key={`${inst.file}-${inst.line}-${idx}`} value={`${inst.file}-${inst.line}-${idx}`}>
          <AccordionTrigger>
            <span className="text-left">
              {inst.file}:{inst.line} • {inst.importType}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div><span className="font-medium">Parent:</span> {inst.parentComponent ?? '—'}</div>
              <div className="font-medium">Props:</div>
              <ul className="list-disc ml-6">
                {inst.props.length === 0 && <li>None</li>}
                {inst.props.map((p, i) => (
                  <li key={i}><span className="font-medium">{p.name}</span> ({p.valueType}){p.valuePreview ? `: ${p.valuePreview}` : ''}</li>
                ))}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}