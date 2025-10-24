'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface AnalyzerFormProps {
  onAnalyze: (projectPath: string, libraryName: string) => void;
  busy?: boolean;
}

export function AnalyzerForm({ onAnalyze, busy }: AnalyzerFormProps) {
  const [projectPath, setProjectPath] = useState('');
  const [libraryName, setLibraryName] = useState('');

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
      <Button
        className="w-full md:w-auto"
        disabled={!projectPath || !libraryName || busy}
        onClick={() => onAnalyze(projectPath, libraryName)}
      >
        {busy ? 'Analyzing…' : 'Analyze'}
      </Button>
    </div>
  );
}