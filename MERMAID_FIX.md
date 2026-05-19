# Mermaid Module Resolution Fix

## Problem
Error: `Module not found: Can't resolve './chunk-336JU56O.mjs'` when using mermaid@11.12.3 with Next.js and pnpm.

## Root Cause
Mermaid v11.x has internal chunk files that aren't properly resolved by Next.js webpack when using pnpm's strict node_modules structure.

## Solutions Applied

### 1. Next.js Configuration (next.config.ts)
Added webpack configuration to handle .mjs file resolution:

```typescript
webpack: (config) => {
  config.resolve.extensionAlias = {
    '.js': ['.js', '.ts', '.tsx', '.jsx'],
    '.mjs': ['.mjs', '.mts'],
  };
  return config;
},
transpilePackages: ['mermaid'],
```

### 2. PNPM Configuration (.npmrc)
Added public hoisting pattern for mermaid:

```
public-hoist-pattern[]=*mermaid*
```

This hoists mermaid and its dependencies to the root node_modules, making chunk files accessible.

### 3. Alternative Component (components/mermaid-chart-v2.tsx)
Created an improved component with better error handling and lazy loading.

## Steps to Fix

1. **Clean build artifacts:**
   ```bash
   rm -rf .next
   rm -rf node_modules/.pnpm/mermaid*
   ```

2. **Reinstall dependencies:**
   ```bash
   pnpm install
   ```

3. **Rebuild the project:**
   ```bash
   pnpm build
   ```

## Alternative: Downgrade Mermaid

If issues persist, consider downgrading to a more stable version:

```bash
pnpm remove mermaid
pnpm add mermaid@10.9.1
```

Mermaid v10.9.1 is the last stable v10 release with better Next.js compatibility.

## Alternative: Use react-mermaid2

Another option is to use a React wrapper:

```bash
pnpm add react-mermaid2
```

Then use it like:
```tsx
import Mermaid from 'react-mermaid2'

<Mermaid chart={chartDefinition} />
```

## Verification

After applying fixes, test with:

```bash
pnpm dev
```

Navigate to a page using MermaidChart and verify it renders without errors.

## References
- [Mermaid GitHub Issues](https://github.com/mermaid-js/mermaid/issues)
- [Next.js Transpile Packages](https://nextjs.org/docs/app/api-reference/next-config-js/transpilePackages)
- [PNPM Public Hoist Pattern](https://pnpm.io/npmrc#public-hoist-pattern)
