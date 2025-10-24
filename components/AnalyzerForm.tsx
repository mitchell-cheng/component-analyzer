'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface AnalyzerFormProps {
  onAnalyze: (projectPath: string, libraryName: string, includePatterns?: string[], excludePatterns?: string[]) => void;
  busy?: boolean;
}

export function AnalyzerForm({ onAnalyze, busy }: AnalyzerFormProps) {
  const [projectPath, setProjectPath] = useState('');
  const [libraryName, setLibraryName] = useState('');
  const [include, setInclude] = useState('**/*.{js,jsx,ts,tsx}');
  const [exclude, setExclude] = useState('**/node_modules/**,**/.next/**,**/dist/**,**/build/**,**/out/**,**/coverage/**,**/*.d.ts');

  // Brace-aware comma splitter (keeps commas inside {...} groups)
  function parsePatterns(input: string): string[] {
    let depth = 0;
    let buf = '';
    const out: string[] = [];
    for (const ch of input) {
      if (ch === '{') depth++;
      else if (ch === '}') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) {
        const token = buf.trim();
        if (token) out.push(token);
        buf = '';
      } else {
        buf += ch;
      }
    }
    const last = buf.trim();
    if (last) out.push(last);
    return out;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Project Path</label>
          <Input
            placeholder="/absolute/path/to/project"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">UI Library Name</label>
          <Input
            placeholder="antd or @mui/material"
            value={libraryName}
            onChange={(e) => setLibraryName(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Include Patterns</label>
          <Input
            placeholder="comma-separated globs"
            value={include}
            onChange={(e) => setInclude(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Exclude Patterns</label>
          <Input
            placeholder="comma-separated globs"
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
          />
        </div>
      </div>
      <Button
        className="w-full md:w-auto"
        disabled={!projectPath || !libraryName || busy}
        onClick={() => onAnalyze(
          projectPath,
          libraryName,
          parsePatterns(include),
          parsePatterns(exclude),
        )}
      >
        {busy ? 'Analyzing…' : 'Analyze'}
      </Button>
    </div>
  );
}