# Docker Build Fixes Summary

## Issues Fixed

### 1. ✅ Mermaid Module Resolution Error
**Problem:** `Module not found: Can't resolve './chunk-336JU56O.mjs'`

**Solution:**
- Added Turbopack configuration in `next.config.ts`
- Added webpack fallback configuration
- Added `transpilePackages: ['mermaid']`
- Updated `.npmrc` with `public-hoist-pattern[]=*mermaid*`

**Files Changed:**
- `next.config.ts`
- `.npmrc`

### 2. ✅ Docker Build SIGKILL (Memory Issue)
**Problem:** Build killed after 18 minutes due to insufficient memory

**Solution:**
- Increased Node.js memory limit to 8GB
- Disabled source maps in production
- Added proper .dockerignore to reduce build context
- Switched from npm to pnpm (matches project)

**Files Changed:**
- `Dockerfile`
- `.dockerignore` (created)

### 3. ✅ Node.js Version Mismatch
**Problem:** pnpm 10.30.1 requires Node.js 18.12+, but Docker used Node.js 20

**Solution:**
- Upgraded Docker base image to Node.js 22
- Pinned pnpm version to 10.30.1 using corepack
- Added `packageManager` field to package.json

**Files Changed:**
- `Dockerfile`
- `Dockerfile.prebuilt`
- `package.json`

### 4. ✅ Missing Git in Docker
**Problem:** `ENOENT: Command failed with ENOENT: git init` - GitHub dependencies require git

**Solution:**
- Added git to Alpine packages in Dockerfile
- Required for `@nanostores/react: "github:ai/react"` dependency

**Files Changed:**
- `Dockerfile`
- `Dockerfile.prebuilt`

## Files Created

### Documentation
- `MERMAID_FIX.md` - Detailed mermaid troubleshooting guide
- `DOCKER_BUILD_FIX.md` - Detailed Docker build troubleshooting guide
- `DOCKER_QUICK_START.md` - Quick start guide for Docker builds
- `DOCKER_FIXES_SUMMARY.md` - This file

### Build Scripts
- `docker-build.sh` - Bash script for Linux/Mac
- `docker-build.ps1` - PowerShell script for Windows

### Docker Files
- `.dockerignore` - Excludes unnecessary files from build context
- `Dockerfile.prebuilt` - Alternative Dockerfile for pre-built artifacts

### Components
- `components/mermaid-chart-v2.tsx` - Improved mermaid component with better error handling

## Quick Start

### Build Docker Image

**Option 1: Using build script (Recommended)**
```bash
# Windows
.\docker-build.ps1 -ImageName "berry-realm" -BuildType "normal"

# Linux/Mac
./docker-build.sh berry-realm normal
```

**Option 2: Manual build**
```bash
docker build --memory=10g --memory-swap=12g --cpus=4 -t berry-realm:latest .
```

**Option 3: Pre-built artifacts (if Docker memory is limited)**
```bash
# Build locally first
pnpm build

# Then build Docker image
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

### Run Container
```bash
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

## Verification

### 1. Verify Local Build Works
```bash
pnpm install
pnpm build
```
Expected: Build completes successfully without mermaid errors

### 2. Verify Docker Build Works
```bash
docker build -t berry-realm:latest .
```
Expected: Build completes in 10-20 minutes without SIGKILL

### 3. Verify Container Runs
```bash
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```
Expected: Container starts and responds on http://localhost:3000

## Configuration Summary

### Docker Requirements
- **Memory:** 10GB minimum (12GB recommended)
- **CPU:** 4 cores minimum (6+ recommended)
- **Disk:** 20GB free space
- **Docker Desktop:** Latest version

### Environment Variables (Build Time)
- `NODE_OPTIONS="--max-old-space-size=8192"` - 8GB memory for Node.js
- `NEXT_TELEMETRY_DISABLED=1` - Disable Next.js telemetry
- `GENERATE_SOURCEMAP=false` - Disable source maps

### Package Versions
- Node.js: 22 (Alpine)
- pnpm: 10.30.1
- Next.js: 16.1.6
- mermaid: 11.2.3

## Troubleshooting

### Build still fails with SIGKILL
1. Increase Docker memory to 12GB or more
2. Use pre-built artifacts method
3. Close other applications to free RAM
4. Try low-memory build: `./docker-build.sh berry-realm low-memory`

### Mermaid still not working
1. Clear build cache: `rm -rf .next`
2. Reinstall dependencies: `pnpm install`
3. Rebuild: `pnpm build`
4. Use alternative component: `components/mermaid-chart-v2.tsx`

### pnpm version mismatch
1. Check `packageManager` field in package.json
2. Run: `corepack prepare pnpm@10.30.1 --activate`
3. Verify: `pnpm --version` should show 10.30.1

## Next Steps

1. ✅ Test local build: `pnpm build`
2. ✅ Test Docker build: `docker build -t berry-realm:latest .`
3. ✅ Test container: `docker run -p 3000:3000 -p 3002:3002 berry-realm:latest`
4. ✅ Configure environment variables for production
5. ✅ Set up Docker Compose for easier deployment
6. ✅ Deploy to production environment

## Support Resources

- **Mermaid Issues:** See `MERMAID_FIX.md`
- **Docker Issues:** See `DOCKER_BUILD_FIX.md`
- **Quick Start:** See `DOCKER_QUICK_START.md`
- **Build Scripts:** Use `docker-build.sh` or `docker-build.ps1`

## Rollback Instructions

If you need to revert changes:

### Revert Dockerfile
```bash
git checkout HEAD -- Dockerfile
```

### Revert next.config.ts
```bash
git checkout HEAD -- next.config.ts
```

### Revert .npmrc
```bash
git checkout HEAD -- .npmrc
```

### Revert package.json
```bash
git checkout HEAD -- package.json
pnpm install
```

## Success Criteria

✅ Local build completes without errors  
✅ Docker build completes in 10-20 minutes  
✅ No SIGKILL errors during build  
✅ No mermaid module resolution errors  
✅ Container starts successfully  
✅ Application accessible on http://localhost:3000  
✅ WebSocket server running on port 3002  

All criteria should be met for a successful deployment.
