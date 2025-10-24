import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import type { ImportDetail, ImportMap } from "./types";

function sourceMatchesLibrary(source: string, libraryName: string): boolean {
  return source === libraryName || source.startsWith(`${libraryName}/`);
}

export function collectImportsForLibrary(
  ast: t.File,
  libraryName: string
): ImportMap {
  const locals: Record<string, ImportDetail> = {};
  const sources = new Set<string>();
  let hasSideEffectImport = false;
  const reExports = new Set<string>();

  traverse(ast, {
    ImportDeclaration(path) {
      const source = (path.node.source.value as string) || "";
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
            importType: "named",
            source,
            componentName: imported,
          };
        } else if (t.isImportDefaultSpecifier(spec)) {
          const local = spec.local.name;
          locals[local] = {
            importType: "default",
            source,
            componentName: "default",
          };
        } else if (t.isImportNamespaceSpecifier(spec)) {
          const local = spec.local.name;
          locals[local] = {
            importType: "namespace",
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
        t.isIdentifier(init.callee, { name: "require" }) &&
        init.arguments.length === 1 &&
        t.isStringLiteral(init.arguments[0])
      ) {
        const source = init.arguments[0].value;
        if (!sourceMatchesLibrary(source, libraryName)) return;
        sources.add(source);

        if (t.isIdentifier(id)) {
          // const Antd = require('antd')
          locals[id.name] = {
            importType: "require-namespace",
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
              const local = t.isIdentifier(prop.value)
                ? prop.value.name
                : undefined;
              if (!local) continue;
              locals[local] = {
                importType: "require-named",
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
        t.isIdentifier(init.object.callee, { name: "require" }) &&
        init.object.arguments.length === 1 &&
        t.isStringLiteral(init.object.arguments[0]) &&
        t.isIdentifier(init.property)
      ) {
        const source = (init.object.arguments[0] as t.StringLiteral).value;
        if (!sourceMatchesLibrary(source, libraryName)) return;
        sources.add(source);

        if (t.isIdentifier(id)) {
          locals[id.name] = {
            importType: "require-named",
            source,
            componentName: init.property.name,
          };
        }
      }
      // dynamic import patterns: await import('lib')
      function extractImportSourceFromAwaitImport(node: t.Node): string | null {
        if (
          t.isAwaitExpression(node) &&
          t.isCallExpression(node.argument) &&
          t.isImport(node.argument.callee)
        ) {
          const arg0 = node.argument.arguments[0];
          return t.isStringLiteral(arg0) ? arg0.value : null;
        }
        if (t.isCallExpression(node) && t.isImport(node.callee)) {
          const arg0 = node.arguments[0];
          return t.isStringLiteral(arg0) ? arg0.value : null;
        }
        return null;
      }

      const dynSource = extractImportSourceFromAwaitImport(init);
      if (dynSource && sourceMatchesLibrary(dynSource, libraryName)) {
        sources.add(dynSource);
        if (t.isIdentifier(id)) {
          // const Antd = await import('antd')
          locals[id.name] = {
            importType: "dynamic-namespace",
            source: dynSource,
          };
        } else if (t.isObjectPattern(id)) {
          // const { Button, Modal } = await import('antd')
          for (const prop of id.properties) {
            if (t.isObjectProperty(prop)) {
              const keyName = t.isIdentifier(prop.key)
                ? prop.key.name
                : t.isStringLiteral(prop.key)
                ? prop.key.value
                : undefined;
              const local = t.isIdentifier(prop.value)
                ? prop.value.name
                : undefined;
              if (keyName && local) {
                locals[local] = {
                  importType: "dynamic-named",
                  source: dynSource,
                  componentName: keyName,
                };
              }
            }
          }
        }
      }

      // const Button = (await import('antd')).Button or .default
      if (
        t.isMemberExpression(init) &&
        (t.isAwaitExpression(init.object) ||
          (t.isCallExpression(init.object) &&
            t.isImport(init.object.callee))) &&
        t.isIdentifier(init.property)
      ) {
        const obj = init.object;
        let sourceLit: t.StringLiteral | null = null;
        if (t.isAwaitExpression(obj) && t.isCallExpression(obj.argument)) {
          const call = obj.argument;
          if (t.isImport(call.callee) && t.isStringLiteral(call.arguments[0])) {
            sourceLit = call.arguments[0] as t.StringLiteral;
          }
        }
        if (
          t.isCallExpression(obj) &&
          t.isImport(obj.callee) &&
          t.isStringLiteral(obj.arguments[0])
        ) {
          sourceLit = obj.arguments[0] as t.StringLiteral;
        }
        if (sourceLit && sourceMatchesLibrary(sourceLit.value, libraryName)) {
          sources.add(sourceLit.value);
          if (t.isIdentifier(id)) {
            const isDefault = init.property.name === "default";
            locals[id.name] = {
              importType: isDefault ? "dynamic-default" : "dynamic-named",
              source: sourceLit.value,
              componentName: isDefault ? "default" : init.property.name,
            };
          }
        }
      }
    },

    // export { Button } from 'antd'
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const src = path.node.source?.value ?? null;
      if (!src || !sourceMatchesLibrary(src, libraryName)) return;
      for (const spec of path.node.specifiers) {
        if (t.isExportSpecifier(spec)) {
          const exported = t.isIdentifier(spec.exported)
            ? spec.exported.name
            : String(spec.exported);
          reExports.add(exported);
        }
      }
    },
  });

  return { locals, sources, hasSideEffectImport, reExports };
}
