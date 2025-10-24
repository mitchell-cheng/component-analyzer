import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { scanProjectFiles } from '@/lib/analyzer/fileScanner';
import type { AnalyzerRequest } from '@/lib/analyzer/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AnalyzerRequest>;
    const projectPathInput = body.projectPath?.trim();

    if (!projectPathInput) {
      return NextResponse.json({ error: 'Missing projectPath.' }, { status: 400 });
    }

    const projectPath =
      path.isAbsolute(projectPathInput)
        ? projectPathInput
        : path.join(process.cwd(), projectPathInput);

    await fs.access(projectPath);

    const files = await scanProjectFiles(
      projectPath,
      body.includePatterns && body.includePatterns.length ? body.includePatterns : ['**/*.{js,jsx,ts,tsx}'],
      body.excludePatterns && body.excludePatterns.length
        ? body.excludePatterns
        : [
            '**/node_modules/**',
            '**/.next/**',
            '**/dist/**',
            '**/build/**',
            '**/out/**',
            '**/coverage/**',
            '**/*.d.ts',
          ],
    );

    return NextResponse.json({ count: files.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}