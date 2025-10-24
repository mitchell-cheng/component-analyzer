import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { analyzeProject } from '@/lib/analyzer';
import type { AnalyzerRequest } from '@/lib/analyzer/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AnalyzerRequest>;
    const projectPathInput = body.projectPath?.trim();
    const libraryName = body.libraryName?.trim();

    if (!projectPathInput || !libraryName) {
      return NextResponse.json(
        { error: 'Missing projectPath or libraryName.' },
        { status: 400 },
      );
    }

    const projectPath =
      path.isAbsolute(projectPathInput)
        ? projectPathInput
        : path.join(process.cwd(), projectPathInput);

    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { error: `Path not accessible: ${projectPath}` },
        { status: 400 },
      );
    }

    const result = await analyzeProject({
      projectPath,
      libraryName,
      // You can tweak patterns to include/exclude certain folders
      includePatterns: ['**/*.{js,jsx,ts,tsx}'],
      excludePatterns: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '**/coverage/**',
        '**/*.d.ts',
      ],
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}