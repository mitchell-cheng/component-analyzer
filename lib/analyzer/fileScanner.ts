import fg from 'fast-glob';

export async function scanProjectFiles(
  projectPath: string,
  includePatterns: string[] = ['**/*.{js,jsx,ts,tsx}'],
  excludePatterns: string[] = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/coverage/**',
    '**/*.d.ts',
  ],
): Promise<string[]> {
  return fg(includePatterns, {
    cwd: projectPath,
    absolute: true,
    ignore: excludePatterns,
    dot: true,
    followSymbolicLinks: false,
  });
}