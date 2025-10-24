import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type {
  ComponentInstance,
  ComponentProp,
  ImportMap,
  ImportType,
  PropValueType,
} from './types';

function jsxNameToString(name: t.JSXIdentifier | t.JSXMemberExpression): string {
  if (t.isJSXIdentifier(name)) return name.name;
  const left = jsxNameToString(name.object as any);
  const right = t.isJSXIdentifier(name.property)
    ? name.property.name
    : String(name.property);
  return `${left}.${right}`;
}

function jsxNameRoot(
  name: t.JSXIdentifier | t.JSXMemberExpression,
): string | null {
  if (t.isJSXIdentifier(name)) return name.name;
  let obj = name.object;
  while (t.isJSXMemberExpression(obj)) {
    obj = obj.object;
  }
  return t.isJSXIdentifier(obj) ? obj.name : null;
}

function detectValueType(node: t.Node | null | undefined): PropValueType {
  if (!node) return 'unknown';
  if (t.isStringLiteral(node)) return 'string';
  if (t.isNumericLiteral(node)) return 'number';
  if (t.isBooleanLiteral(node)) return 'boolean';
  if (t.isNullLiteral(node)) return 'null';
  if (t.isObjectExpression(node)) return 'object';
  if (t.isArrayExpression(node)) return 'array';
  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node))
    return 'function';
  if (t.isIdentifier(node)) return 'identifier';
  if (t.isMemberExpression(node)) return 'member';
  if (t.isCallExpression(node)) return 'call';
  if (t.isTemplateLiteral(node)) return 'template';
  if (t.isConditionalExpression(node)) return 'conditional';
  if (t.isLogicalExpression(node)) return 'logical';
  if (t.isJSXElement(node) || t.isJSXFragment(node)) return 'jsx';
  return 'unknown';
}

function slicePreview(code: string, node?: t.Node | null): string | undefined {
  if (!node || typeof (node as any).start !== 'number' || typeof (node as any).end !== 'number') {
    return undefined;
  }
  try {
    return code.slice((node as any).start, (node as any).end);
  } catch {
    return undefined;
  }
}

function resolveExpressionValueType(
  contextPath: NodePath,
  expr: t.Node | null | undefined,
  depth = 0,
): PropValueType {
  if (!expr || depth > 3) return 'unknown';
  if (!t.isExpression(expr)) return detectValueType(expr);
  // direct
  const direct = detectValueType(expr);
  if (direct !== 'identifier' && direct !== 'member') return direct;

  // identifier -> trace binding init
  if (t.isIdentifier(expr)) {
    const binding = contextPath.scope.getBinding(expr.name);
    if (binding && binding.path.isVariableDeclarator()) {
      const init = binding.path.node.init || null;
      if (init) {
        // recurse
        return resolveExpressionValueType(contextPath, init as t.Expression, depth + 1);
      }
    }
    return 'identifier';
  }

  // member -> object literal property
  if (t.isMemberExpression(expr)) {
    if (t.isIdentifier(expr.object)) {
      const binding = contextPath.scope.getBinding(expr.object.name);
      if (binding && binding.path.isVariableDeclarator()) {
        const init = binding.path.node.init;
        if (init && t.isObjectExpression(init)) {
          const keyName = t.isIdentifier(expr.property)
            ? expr.property.name
            : t.isStringLiteral(expr.property)
            ? expr.property.value
            : null;
          if (keyName) {
            for (const prop of init.properties) {
              if (t.isObjectProperty(prop)) {
                const k =
                  t.isIdentifier(prop.key)
                    ? prop.key.name
                    : t.isStringLiteral(prop.key)
                    ? prop.key.value
                    : null;
                if (k === keyName) {
                  return resolveExpressionValueType(contextPath, prop.value as t.Expression, depth + 1);
                }
              }
            }
          }
        }
      }
    }
    return 'member';
  }

  return direct;
}

export function collectUsageFromAst(
  ast: t.File,
  code: string,
  filePath: string,
  importMap: ImportMap,
): ComponentInstance[] {
  const results: ComponentInstance[] = [];

  traverse(ast, {
    JSXElement(path) {
      const open = path.node.openingElement;
      const nameNode = open.name;
      const nameStr = jsxNameToString(nameNode as any);
      const root = jsxNameRoot(nameNode as any);

      if (!root) return;
      const importDetail = importMap.locals[root] || importMap.locals[nameStr];
      // Root must be imported from the target library
      if (!importDetail) return;

      const importType: ImportType = importDetail.importType;

      // Determine canonical component name:
      // - For identifier: prefer the imported componentName ('Button'), else use local name.
      // - For member: use full chain (e.g., 'Form.Item' or 'Antd.Button').
      let componentName: string;
      if (t.isJSXIdentifier(nameNode)) {
        componentName =
          importDetail.componentName && importDetail.componentName !== 'default'
            ? importDetail.componentName
            : nameStr;
      } else {
        componentName = nameStr;
      }

      // Parent component (nearest JSX ancestor)
      const parentJsx = path.findParent((p) => p.isJSXElement()) as
        | NodePath<t.JSXElement>
        | null;
      const parentName =
        parentJsx && parentJsx.node.openingElement
          ? jsxNameToString(parentJsx.node.openingElement.name as any)
          : undefined;

      // Props
      const props: ComponentProp[] = [];
      for (const attr of open.attributes) {
        if (t.isJSXAttribute(attr)) {
          const propName = t.isJSXIdentifier(attr.name)
            ? attr.name.name
            : String(attr.name);
          if (!attr.value) {
            props.push({ name: propName, valueType: 'boolean' });
            continue;
          }
          if (t.isStringLiteral(attr.value)) {
            props.push({
              name: propName,
              valueType: 'string',
              valuePreview: attr.value.value,
            });
          } else if (t.isJSXExpressionContainer(attr.value)) {
            const expr = attr.value.expression;
            props.push({
              name: propName,
              valueType: resolveExpressionValueType(path, expr),
              valuePreview: slicePreview(code, expr),
            });
          } else {
            props.push({
              name: propName,
              valueType: 'unknown',
              valuePreview: slicePreview(code, attr.value as any),
            });
          }
        } else if (t.isJSXSpreadAttribute(attr)) {
          props.push({
            name: '...spread',
            valueType: 'spread',
            valuePreview: slicePreview(code, attr.argument),
          });
        }
      }

      const loc = path.node.loc?.start;
      results.push({
        component: componentName,
        file: filePath,
        line: loc?.line ?? 0,
        endLine: path.node.loc?.end?.line,
        parentComponent: parentName,
        importType,
        props,
      });
    },
  });

  return results;
}