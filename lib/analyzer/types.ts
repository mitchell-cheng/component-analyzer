export type ImportType =
  | "named"
  | "default"
  | "namespace"
  | "side-effect"
  | "require-named"
  | "require-default"
  | "require-namespace"
  | "dynamic-named"
  | "dynamic-default"
  | "dynamic-namespace"
  | "re-export";

export interface ImportDetail {
  importType: ImportType;
  source: string;
  componentName?: string; // e.g., 'Button' for named import, 'default' for default imports
}

export interface ImportMap {
  locals: Record<string, ImportDetail>;
  sources: Set<string>;
  hasSideEffectImport: boolean;
  reExports?: Set<string>;
}

export type PropValueType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "object"
  | "array"
  | "function"
  | "identifier"
  | "member"
  | "call"
  | "template"
  | "conditional"
  | "logical"
  | "spread"
  | "jsx"
  | "unknown";

export interface ComponentProp {
  name: string;
  valueType: PropValueType;
  valuePreview?: string;
}

export interface ComponentInstance {
  component: string; // e.g., 'Button' or 'Form.Item'
  file: string;
  line: number;
  endLine?: number;
  parentComponent?: string;
  importType: ImportType;
  props: ComponentProp[];
}

export interface PropStat {
  count: number;
  valueTypes: Set<PropValueType>;
}

export interface ComponentSummary {
  component: string;
  total: number;
  maxPropsPerInstance: number;
  propStats: Record<string, PropStat>;
  files: Set<string>;
  importTypes: Set<ImportType>;
}

export interface AnalysisResult {
  libraryName: string;
  scannedFiles: number;
  excludedFiles: number;
  durationMs: number;
  components: Array<{
    summary: ComponentSummary;
    instances: ComponentInstance[];
  }>;
}

export interface AnalyzerRequest {
  projectPath: string;
  libraryName: string;
  includePatterns?: string[];
  excludePatterns?: string[];
}
