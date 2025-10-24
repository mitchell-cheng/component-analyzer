import { scanProjectFiles } from './fileScanner';
import { collectImportsForLibrary } from './imports';
import { collectUsageFromAst } from './usage';
import type {
  AnalysisResult,
  AnalyzerRequest,
  ComponentInstance,
  ComponentSummary,
} from './types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'fs/promises';
import pLimit from 'p-limit';

function summarize(instances: ComponentInstance[]) {
  const byComponent = new Map<string, ComponentInstance[]>();
  for (const inst of instances) {
    const arr = byComponent.get(inst.component) ?? [];
    arr.push(inst);
    byComponent.set(inst.component, arr);
  }

  const components: Array<{ summary: ComponentSummary; instances: ComponentInstance[] }> = [];

  for (const [component, list] of byComponent.entries()) {
    const propStats: ComponentSummary['propStats'] = {};
    const files = new Set<string>();
    const importTypes = new Set(list.map((i) => i.importType));
    let maxPropsPerInstance = 0;

    for (const inst of list) {
      files.add(inst.file);
      maxPropsPerInstance = Math.max(maxPropsPerInstance, inst.props.length);
      for (const p of inst.props) {
        const stat = propStats[p.name] ?? { count: 0, valueTypes: new Set() };
        stat.count += 1;
        stat.valueTypes.add(p.valueType);
        propStats[p.name] = stat;
      }
    }

    const summary: ComponentSummary = {
      component,
      total: list.length,
      maxPropsPerInstance,
      propStats,
      files,
      importTypes,
    };

    components.push({ summary, instances: list });
  }

  // Sort components by total desc
  components.sort((a, b) => b.summary.total - a.summary.total);
  return components;
}

export async function analyzeProject(req: AnalyzerRequest): Promise<AnalysisResult> {
  const start = Date.now();

  const files = await scanProjectFiles(req.projectPath, req.includePatterns, req.excludePatterns);
  const limit = pLimit(8);
  let excludedFiles = 0;
  const allInstances: ComponentInstance[] = [];

  await Promise.all(
    files.map((file) =>
      limit(async () => {
        let code: string;
        try {
          code = await fs.readFile(file, 'utf8');
        } catch {
          excludedFiles += 1;
          return;
        }

        let ast: t.File;
        try {
          ast = parse(code, {
            sourceType: 'unambiguous',
            allowImportExportEverywhere: true,
            errorRecovery: true,
            ranges: true,
            plugins: [
              'jsx',
              'typescript',
              'classProperties',
              'classPrivateMethods',
              'classPrivateProperties',
              'decorators-legacy',
              'dynamicImport',
              'importAssertions',
              'topLevelAwait',
              'objectRestSpread',
            ],
          });
        } catch {
          excludedFiles += 1;
          return;
        }

        const importMap = collectImportsForLibrary(ast, req.libraryName);
        const instances = collectUsageFromAst(ast, code, file, importMap);
        if (instances.length > 0) {
          allInstances.push(...instances);
        }
      }),
    ),
  );

  const components = summarize(allInstances);

  return {
    libraryName: req.libraryName,
    scannedFiles: files.length,
    excludedFiles,
    durationMs: Date.now() - start,
    components,
  };
}