"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { ComponentInstance } from '@/lib/analyzer/types';

export function InstancesAccordion({
  instances,
  basePath,
}: {
  instances: ComponentInstance[];
  basePath?: string;
}) {
  // Group instances by file and collapse by default
  const byFile = new Map<string, ComponentInstance[]>();
  for (const inst of instances) {
    const arr = byFile.get(inst.file) ?? [];
    arr.push(inst);
    byFile.set(inst.file, arr);
  }

  const normalizeBase = (base?: string) => (base ? base.replace(/\/$/, '') : undefined);
  const base = normalizeBase(basePath);
  const toRelative = (file: string) => {
    if (!base) return file;
    if (file.startsWith(base)) {
      const rel = file.slice(base.length);
      return rel.startsWith('/') ? rel.slice(1) : rel || '.';
    }
    return file;
  };

  const importVariant = (t: ComponentInstance['importType']) =>
    t === 'named' || t === 'require-named'
      ? 'default'
      : t === 'default' || t === 'require-default'
      ? 'secondary'
      : t === 'namespace' || t === 'require-namespace'
      ? 'outline'
      : 'destructive';

  const propVariant = (v: string) =>
    v === 'string' || v === 'template' || v === 'jsx'
      ? 'secondary'
      : v === 'number' || v === 'array'
      ? 'default'
      : v === 'boolean' || v === 'identifier' || v === 'member'
      ? 'outline'
      : 'destructive';

  const entries = Array.from(byFile.entries())
    .map(([file, list]) => [file, list.sort((a, b) => a.line - b.line)] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Accordion type="multiple" collapsible className="w-full">
      {entries.map(([file, list]) => (
        <AccordionItem key={file} value={file}>
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{list.length} usage{list.length === 1 ? '' : 's'}</Badge>
              <span className="font-mono text-sm">{toRelative(file)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {list.map((inst, idx) => (
                <div key={`${inst.file}-${inst.line}-${idx}`} className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <Badge variant="default">
                      Line {inst.line}{inst.endLine && inst.endLine !== inst.line ? `-${inst.endLine}` : ''}
                    </Badge>
                    <Badge variant={importVariant(inst.importType)}>
                      {inst.importType}
                    </Badge>
                    {inst.parentComponent && (
                      <Badge variant="outline">parent: {inst.parentComponent}</Badge>
                    )}
                  </div>
                  <div className="text-sm font-medium mt-2">Props:</div>
                  <div className="flex flex-wrap gap-2 ml-1">
                    {inst.props.length === 0 && <span className="text-muted-foreground">None</span>}
                    {inst.props.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Badge variant={propVariant(p.valueType)}>{p.name}</Badge>
                        <Badge variant="outline">{p.valueType}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
