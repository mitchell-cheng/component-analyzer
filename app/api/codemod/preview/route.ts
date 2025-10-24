import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { scanProjectFiles } from '@/lib/analyzer/fileScanner';
import transform from '@/lib/codemods/replaceImportSource';
import jscodeshift from 'jscodeshift';
import { createTwoFilesPatch } from 'diff';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectPathInput = body.projectPath?.trim();
    const oldLib = (body.libraryName ?? body.oldLib)?.trim();
    const newLib = body.newLib?.trim();
    const includePatterns: string[] | undefined = body.includePatterns;
    const excludePatterns: string[] | undefined = body.excludePatterns;
    const preserveSubpath = !!body.preserveSubpath;

    if (!projectPathInput || !oldLib || !newLib) {
      return NextResponse.json(
        { error: 'Missing projectPath, oldLib/libraryName, or newLib.' },
        { status: 400 },
      );
    }

    // Local-only guard
    if (process.env.NODE_ENV === 'production' && process.env.ANALYZER_ALLOW_IN_PROD !== 'true') {
      return NextResponse.json(
        { error: 'Codemod disabled in production. Set ANALYZER_ALLOW_IN_PROD=true to enable.' },
        { status: 403 },
      );
    }

    const projectPath = path.isAbsolute(projectPathInput)
      ? projectPathInput
      : path.join(process.cwd(), projectPathInput);

    // Optional path whitelist
    const whitelist =
      process.env.ANALYZER_PATH_WHITELIST?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (whitelist.length > 0 && !whitelist.some((base) => projectPath.startsWith(base))) {
      return NextResponse.json({ error: 'Project path not in whitelist.' }, { status: 403 });
    }

    await fs.access(projectPath);

    const files = await scanProjectFiles(
      projectPath,
      includePatterns && includePatterns.length
        ? includePatterns
        : ['**/*.{js,jsx,ts,tsx}'],
      excludePatterns && excludePatterns.length
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
    );

    const diffs: Array<{ file: string; diff: string }> = [];

    for (const file of files) {
      let code: string;
      try {
        code = await fs.readFile(file, 'utf8');
      } catch {
        continue;
      }

      let output: string;
      try {
        output = transform(
          { source: code, path: file } as any,
          { jscodeshift, stats: () => {} } as any,
          { oldLib, newLib, preserveSubpath },
        );
      } catch {
        continue;
      }

      if (output && output !== code) {
        const patch = createTwoFilesPatch(file, file, code, output, '', '');
        diffs.push({ file, diff: patch });
      }
    }

    return NextResponse.json({ changedCount: diffs.length, diffs });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}