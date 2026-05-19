# Build Test Checklist

Use this checklist to verify all fixes are working correctly.

## Pre-Build Checks

### Local Environment
- [ ] Node.js version: `node --version` (should be v18+ for local, v22 in Docker)
- [ ] pnpm version: `pnpm --version` (should be 10.30.1)
- [ ] pnpm installed: `corepack enable && corepack prepare pnpm@10.30.1 --activate`
- [ ] Docker running: `docker info` (no errors)
- [ ] Docker memory: At least 10GB allocated (Docker Desktop → Settings → Resources)

### File Verification
- [ ] `Dockerfile` uses `node:22-alpine`
- [ ] `Dockerfile` has `corepack prepare pnpm@10.30.1 --activate`
- [ ] `package.json` has `"packageManager": "pnpm@10.30.1"`
- [ ] `next.config.ts` has `transpilePackages: ['mermaid']`
- [ ] `next.config.ts` has `turbopack` configuration
- [ ] `.npmrc` has `public-hoist-pattern[]=*mermaid*`
- [ ] `.dockerignore` exists and excludes `node_modules`, `.next`, etc.

## Local Build Test

### Step 1: Clean Build
```bash
# Clean previous builds
rm -rf .next node_modules/.pnpm/mermaid*

# Reinstall dependencies
pnpm install

# Build
pnpm build
```

**Expected Results:**
- [ ] No mermaid module resolution errors
- [ ] Build completes successfully
- [ ] `.next` directory created
- [ ] Build time: 2-5 minutes (depending on hardware)

### Step 2: Run Locally
```bash
pnpm start
```

**Expected Results:**
- [ ] Server starts on http://localhost:3000
- [ ] No runtime errors in console
- [ ] Pages load correctly
- [ ] Mermaid charts render (if applicable)

## Docker Build Test

### Step 1: Build Docker Image

**Using build script (recommended):**
```bash
# Windows
.\docker-build.ps1 -ImageName "berry-realm-test" -BuildType "normal"

# Linux/Mac
./docker-build.sh berry-realm-test normal
```

**Or manual:**
```bash
docker build --memory=10g --memory-swap=12g --cpus=4 -t berry-realm-test:latest .
```

**Expected Results:**
- [ ] No Node.js version warnings
- [ ] No pnpm version errors
- [ ] No "ERR_UNKNOWN_BUILTIN_MODULE" errors
- [ ] No SIGKILL errors
- [ ] Build completes successfully
- [ ] Build time: 10-20 minutes (first build)
- [ ] Image size: ~1-2GB

**Monitor during build:**
```bash
# In another terminal
docker stats
```
- [ ] Memory usage stays below 10GB
- [ ] No sudden drops to 0 (indicates SIGKILL)

### Step 2: Run Docker Container
```bash
docker run -p 3000:3000 -p 3002:3002 --name berry-realm-test berry-realm-test:latest
```

**Expected Results:**
- [ ] Container starts without errors
- [ ] Server accessible at http://localhost:3000
- [ ] WebSocket server running on port 3002
- [ ] No crash loops
- [ ] Logs show successful startup

### Step 3: Test Container
```bash
# Check container logs
docker logs berry-realm-test

# Check container health
docker ps | grep berry-realm-test

# Test HTTP endpoint
curl http://localhost:3000

# Enter container (optional)
docker exec -it berry-realm-test sh
```

**Expected Results:**
- [ ] Logs show no errors
- [ ] Container status is "Up"
- [ ] HTTP request returns HTML
- [ ] Can access container shell

### Step 4: Cleanup
```bash
# Stop container
docker stop berry-realm-test

# Remove container
docker rm berry-realm-test

# Remove image (optional)
docker rmi berry-realm-test:latest
```

## Troubleshooting Tests

### If Build Fails with Memory Error
- [ ] Increase Docker memory to 12GB
- [ ] Try low-memory build: `./docker-build.sh berry-realm-test low-memory`
- [ ] Try pre-built method: Build locally first, then use `Dockerfile.prebuilt`

### If Mermaid Errors Persist
- [ ] Verify `.npmrc` has correct hoisting pattern
- [ ] Verify `next.config.ts` has transpilePackages
- [ ] Clear pnpm cache: `pnpm store prune`
- [ ] Reinstall: `rm -rf node_modules pnpm-lock.yaml && pnpm install`

### If pnpm Version Mismatch
- [ ] Check `package.json` has `"packageManager": "pnpm@10.30.1"`
- [ ] Run: `corepack prepare pnpm@10.30.1 --activate`
- [ ] Verify: `pnpm --version` shows 10.30.1
- [ ] In Docker, verify Dockerfile has correct corepack prepare command

## Performance Benchmarks

### Local Build
- **First build:** 2-5 minutes
- **Incremental build:** 30-60 seconds
- **Memory usage:** 2-4GB peak

### Docker Build
- **First build:** 10-20 minutes
- **Cached build:** 2-5 minutes
- **Memory usage:** 6-8GB peak
- **Final image size:** 1-2GB

### Runtime
- **Container startup:** 5-10 seconds
- **Memory usage:** 200-500MB
- **Response time:** <100ms

## Success Criteria

All items must be checked for a successful build:

### Critical (Must Pass)
- [ ] Local build completes without errors
- [ ] Docker build completes without SIGKILL
- [ ] No mermaid module resolution errors
- [ ] No Node.js/pnpm version mismatches
- [ ] Container starts and runs successfully
- [ ] Application accessible on http://localhost:3000

### Important (Should Pass)
- [ ] Build completes within expected time
- [ ] Memory usage within limits
- [ ] No warnings in build logs
- [ ] All pages load correctly
- [ ] WebSocket server functional

### Optional (Nice to Have)
- [ ] Build cache working (faster subsequent builds)
- [ ] Image size optimized (<2GB)
- [ ] Startup time <10 seconds
- [ ] No deprecated package warnings

## Sign-off

**Tested by:** _______________  
**Date:** _______________  
**Environment:** _______________  
**Docker version:** _______________  
**Node.js version:** _______________  
**pnpm version:** _______________  

**Overall Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
_______________________________________
_______________________________________
_______________________________________

## Next Steps After Successful Test

1. [ ] Tag image for production: `docker tag berry-realm-test:latest berry-realm:v1.0.0`
2. [ ] Push to registry: `docker push your-registry.com/berry-realm:v1.0.0`
3. [ ] Update deployment configuration
4. [ ] Deploy to staging environment
5. [ ] Run integration tests
6. [ ] Deploy to production
7. [ ] Monitor logs and metrics
8. [ ] Document any issues or improvements

## Support

If any tests fail, refer to:
- `DOCKER_FIXES_SUMMARY.md` - Overview of all fixes
- `DOCKER_BUILD_FIX.md` - Detailed Docker troubleshooting
- `MERMAID_FIX.md` - Mermaid-specific issues
- `DOCKER_QUICK_START.md` - Quick start guide
