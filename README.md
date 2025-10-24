# Component Analyzer

Analyze JSX usage of components from a specific UI library in a local project. Built with Next.js, Babel AST, and shadcn/ui.

## Features

- Analyze React JSX for a target UI library (e.g., `antd`, `@mui/material`, `@mui/joy`)
- Import detection:
  - ES imports (`named`, `default`, `namespace`)
  - CommonJS `require` (`require-named`, `require-default`, `require-namespace`)
  - Dynamic imports (`await import('lib')`) for `namespace`, `named`, and `default` access
  - Re-exports: `export { Button } from 'lib'` recorded for context
- Usage collection:
  - Component instances with file path, line range, parent component, import type, and props
  - Prop value type inference for common patterns (identifiers, object members, literals, functions)
- UI:
  - Include/Exclude patterns for file scanning
  - Progress preview
  - Export current results as JSON
- Performance:
  - Fast-glob scanning
  - Babel parser with relevant plugins
  - Concurrency (`p-limit`)
  - Incremental cache keyed by `projectPath`, `libraryName`, `filePath`, and `mtimeMs`
- Safety:
  - Local-only guard in production unless explicitly allowed
  - Optional path whitelist to limit accessible directories

## Quick Start

Install dependencies:

```bash
pnpm install
```

Run dev server:

```bash
pnpm dev
```

Alternative:

```bash
npm run dev
```

Open `http://localhost:3000` and fill in:

- Project Path: **absolute path** to a local project dir
- UI Library Name: e.g. `antd`, `@mui`, `@mui/material`, `@mui/joy`
- Include Patterns: comma-separated globs
- Exclude Patterns: comma-separated globs

Click “Analyze”. You’ll see progress messages, then results grouped by file. Use “Download JSON” to export.
