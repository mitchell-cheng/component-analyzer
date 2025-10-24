import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { ImportDetail, ImportMap, ImportType } from './types';

function sourceMatchesLibrary(source: string, libraryName: string): boolean {
  return source === libraryName || source.startsWith(`${libraryName}/`);
}

export function collectImportsForLibrary(
  ast: t.File,
  libraryName: string,
): ImportMap {
  const locals: Record<string, ImportDetail> = {};
  const sources = new Set<string>();
  let hasSideEffectImport = false;

  traverse(ast, {
    ImportDeclaration(path) {
      const source = (path.node.source.value as string) || '';
      if (!sourceMatchesLibrary(source, libraryName)) return;
      sources.add(source);

      if (path.node.specifiers.length === 0) {
        hasSideEffectImport = true;
        return;
      }

      for (const spec of path.node.specifiers) {
        if (t.isImportSpecifier(spec)) {
          const local = spec.local.name;
          const imported = t.isIdentifier(spec.imported)
            ? spec.imported.name
            : String(spec.imported);
          locals[local] = {
            importType: 'named',
            source,
            componentName: imported,
          };
        } else if (t.isImportDefaultSpecifier(spec)) {
          const local = spec.local.name;
          locals[local] = {
            importType: 'default',
            source,
            componentName: 'default',
          };
        } else if (t.isImportNamespaceSpecifier(spec)) {
          const local = spec.local.name;
          locals[local] = {
            importType: 'namespace',
            source,
          };
        }
      }
    },

    VariableDeclarator(path) {
      const id = path.node.id;
      const init = path.node.init;
      if (!init) return;

      // require('lib')
      if (
        t.isCallExpression(init) &&
        t.isIdentifier(init.callee, { name: 'require' }) &&
        init.arguments.length === 1 &&
        t.isStringLiteral(init.arguments[0])
      ) {
        const source = init.arguments[0].value;
        if (!sourceMatchesLibrary(source, libraryName)) return;
        sources.add(source);

        if (t.isIdentifier(id)) {
          // const Antd = require('antd')
          locals[id.name] = {
            importType: 'require-namespace',
            source,
          };
        } else if (t.isObjectPattern(id)) {
          // const { Button, Modal } = require('antd')
          for (const prop of id.properties) {
            if (t.isObjectProperty(prop)) {
              const keyName = t.isIdentifier(prop.key)
                ? prop.key.name
                : t.isStringLiteral(prop.key)
                ? prop.key.value
                : undefined;
              if (!keyName) continue;
              const local =
                t.isIdentifier(prop.value) ? prop.value.name : undefined;
              if (!local) continue;
              locals[local] = {
                importType: 'require-named',
                source,
                componentName: keyName,
              };
            }
          }
        }
      }

      // const Button = require('antd').Button
      if (
        t.isMemberExpression(init) &&
        t.isCallExpression(init.object) &&
        t.isIdentifier(init.object.callee, { name: 'require' }) &&
        init.object.arguments.length === 1 &&
        t.isStringLiteral(init.object.arguments[0]) &&
        t.isIdentifier(init.property)
      ) {
        const source = (init.object.arguments[0] as t.StringLiteral).value;
        if (!sourceMatchesLibrary(source, libraryName)) return;
        sources.add(source);

        if (t.isIdentifier(id)) {
          locals[id.name] = {
            importType: 'require-named',
            source,
            componentName: init.property.name,
          };
        }
      }
    },
  });

  return { locals, sources, hasSideEffectImport };
}