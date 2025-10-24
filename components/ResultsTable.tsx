'use client';

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { AnalysisResult, ComponentSummary } from '@/lib/analyzer/types';
import { InstancesAccordion } from './InstancesAccordion';

export function ResultsTable({ result }: { result: AnalysisResult }) {
  if (result.components.length === 0) {
    return <div className="text-sm text-muted-foreground">No components from "{result.libraryName}" found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Scanned {result.scannedFiles} files, excluded {result.excludedFiles}. Took {result.durationMs} ms.
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Max Props</TableHead>
            <TableHead>Props (union types)</TableHead>
            <TableHead>Import Types</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.components.map(({ summary, instances }) => (
            <TableRow key={summary.component}>
              <TableCell className="align-top">
                <div className="font-medium">{summary.component}</div>
                <div className="mt-2">
                  <InstancesAccordion instances={instances} />
                </div>
              </TableCell>
              <TableCell className="align-top">{summary.total}</TableCell>
              <TableCell className="align-top">{summary.maxPropsPerInstance}</TableCell>
              <TableCell className="align-top">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.propStats).map(([name, stat]) => (
                    <Badge key={name} variant="secondary">
                      {name}: {Array.from(stat.valueTypes).join('|')}
                    </Badge>
                  ))}
                  {Object.keys(summary.propStats).length === 0 && <span>—</span>}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-wrap gap-2">
                  {Array.from(summary.importTypes).map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}