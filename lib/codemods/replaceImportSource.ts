import type { API, FileInfo } from 'jscodeshift';

type Options = {
  oldLib: string;
  newLib: string;
  preserveSubpath?: boolean;
};

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options,
) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const oldLib = options.oldLib;
  const newLib = options.newLib;
  const preserve = !!options.preserveSubpath;

  function matches(source?: string): source is string {
    return !!source && (source === oldLib || source.startsWith(`${oldLib}/`));
  }

  function replace(source: string): string {
    if (preserve && source.startsWith(`${oldLib}/`)) {
      const tail = source.slice(oldLib.length);
      return `${newLib}${tail}`;
    }
    return newLib;
  }

  // ES imports
  root.find(j.ImportDeclaration).forEach((p) => {
    const src = (p.node.source && (p.node.source as any).value) as string | undefined;
    if (matches(src)) {
      p.node.source = j.literal(replace(src!));
    }
  });

  // CommonJS require('lib')
  root.find(j.CallExpression, { callee: { name: 'require' } }).forEach((p) => {
    const args = p.node.arguments;
    if (args.length === 1 && args[0].type === 'Literal') {
      const v = (args[0] as any).value as string | undefined;
      if (matches(v)) {
        (args[0] as any).value = replace(v!);
      }
    }
  });

  // Dynamic import('lib')
  root.find(j.CallExpression, (node) => (node.callee as any)?.type === 'Import').forEach((p) => {
    const args = p.node.arguments;
    if (args.length >= 1 && args[0].type === 'Literal') {
      const v = (args[0] as any).value as string | undefined;
      if (matches(v)) {
        (args[0] as any).value = replace(v!);
      }
    }
  });

  return root.toSource({ quote: 'single' });
}