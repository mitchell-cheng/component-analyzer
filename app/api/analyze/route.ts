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
    const includePatterns = body.includePatterns;
    const excludePatterns = body.excludePatterns;

    if (!projectPathInput || !libraryName) {
      return NextResponse.json(
        { error: 'Missing projectPath or libraryName.' },
        { status: 400 },
      );
    }

    // Local-only guard: block in production unless whitelisted
    if (process.env.NODE_ENV === 'production' && process.env.ANALYZER_ALLOW_IN_PROD !== 'true') {
      return NextResponse.json(
        { error: 'Analyzer disabled in production. Set ANALYZER_ALLOW_IN_PROD=true to enable.' },
        { status: 403 },
      );
    }

    const projectPath =
      path.isAbsolute(projectPathInput)
        ? projectPathInput
        : path.join(process.cwd(), projectPathInput);
    // optional whitelist restricts accessible paths
    const whitelist = process.env.ANALYZER_PATH_WHITELIST?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (whitelist.length > 0 && !whitelist.some((base) => projectPath.startsWith(base))) {
      return NextResponse.json(
        { error: 'Project path not in whitelist.' },
        { status: 403 },
      );
    }

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
      includePatterns: includePatterns && includePatterns.length ? includePatterns : ['**/*.{js,jsx,ts,tsx}'],
      excludePatterns: excludePatterns && excludePatterns.length
        ? excludePatterns
        : [
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