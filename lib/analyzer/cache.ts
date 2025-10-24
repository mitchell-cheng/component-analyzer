import fs from 'fs/promises';
import path from 'path';
import type { ComponentInstance } from './types';

const CACHE_VERSION = 2;

type FileEntry = { mtimeMs: number; instances: ComponentInstance[] };
type LibCache = Record<string, FileEntry>;
type ProjectCache = Record<string, LibCache>;
type CacheShape = {
  version: number;
  projects: Record<string, ProjectCache>;
};

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'analyzer-cache.json');

export async function loadCache(): Promise<CacheShape> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const buf = await fs.readFile(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(buf);
    if (parsed && parsed.version === CACHE_VERSION && parsed.projects) {
      return parsed as CacheShape;
    }
  } catch {
    // ignore
  }
  return { version: CACHE_VERSION, projects: {} };
}

export async function saveCache(cache: CacheShape): Promise<void> {
  const data = JSON.stringify(cache, null, 2);
  await fs.writeFile(CACHE_FILE, data, 'utf8');
}

export function getProjectLibCache(
  cache: CacheShape,
  projectPath: string,
  libraryName: string,
): LibCache {
  cache.projects[projectPath] ??= {};
  cache.projects[projectPath][libraryName] ??= {};
  return cache.projects[projectPath][libraryName];
}

export function setProjectLibCacheEntry(
  cache: CacheShape,
  projectPath: string,
  libraryName: string,
  filePath: string,
  entry: FileEntry,
) {
  const lib = getProjectLibCache(cache, projectPath, libraryName);
  lib[filePath] = entry;
}