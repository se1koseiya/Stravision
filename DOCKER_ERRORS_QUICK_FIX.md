# Docker Build Errors - Quick Fix Reference

## Error: `Module not found: Can't resolve './chunk-336JU56O.mjs'`

**Cause:** Mermaid module resolution issue with Next.js + pnpm

**Fix:**
```bash
# Add to next.config.ts
transpilePackages: ['mermaid']
turbopack: { resolveExtensions: [...] }

# Add to .npmrc
public-hoist-pattern[]=*mermaid*

# Rebuild
pnpm install
pnpm build
```

**Files:** `next.config.ts`, `.npmrc`

---

## Error: `SIGKILL` / Build killed after 18 minutes

**Cause:** Out of memory during build

**Fix:**
```bash
# Increase Docker memory to 10GB+
# Docker Desktop → Settings → Resources → Memory: 10GB

# Build with memory limits
docker build --memory=10g --memory-swap=12g --cpus=4 -t image-name .
```

**Alternative:** Build locally first, then use `Dockerfile.prebuilt`

---

## Error: `pnpm requires at least Node.js v22.13`

**Cause:** Node.js version too old for pnpm 10.30.1+

**Fix:**
```dockerfile
# In Dockerfile, change:
FROM node:20-alpine
# To:
FROM node:22-alpine
```

**Files:** `Dockerfile`, `Dockerfile.prebuilt`

---

## Error: `ENOENT: Command failed with ENOENT: git init`

**Cause:** Git not installed, but required for GitHub dependencies

**Fix:**
```dockerfile
# In Dockerfile deps stage, add git:
RUN apk add --no-cache libc6-compat python3 make g++ git
```

**Why:** Package `@nanostores/react: "github:ai/react"` requires git

**Files:** `Dockerfile`, `Dockerfile.prebuilt`

---

## Error: `This version of pnpm requires at least Node.js v22.13`

**Cause:** pnpm version mismatch

**Fix:**
```dockerfile
# In Dockerfile, pin pnpm version:
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
```

```json
// In package.json, add:
"packageManager": "pnpm@10.30.1"
```

**Files:** `Dockerfile`, `package.json`

---

## Error: Build succeeds but container crashes

**Cause:** Missing environment variables or dependencies

**Fix:**
```bash
# Check logs
docker logs <container-id>

# Run with environment variables
docker run -e DATABASE_URL="..." -e OPENAI_API_KEY="..." image-name

# Or use .env file
docker run --env-file .env image-name
```

---

## Error: `Cannot connect to Docker daemon`

**Cause:** Docker not running

**Fix:**
- **Windows/Mac:** Start Docker Desktop
- **Linux:** `sudo systemctl start docker`

---

## Error: `No space left on device`

**Cause:** Docker disk full

**Fix:**
```bash
# Clean up
docker system prune -a

# Check usage
docker system df
```

---

## Quick Build Commands

### Normal Build (Recommended)
```bash
# Windows
.\docker-build.ps1 -ImageName "berry-realm" -BuildType "normal"

# Linux/Mac
./docker-build.sh berry-realm normal

# Manual
docker build --memory=10g --memory-swap=12g --cpus=4 -t berry-realm:latest .
```

### Pre-built (Fastest, if Docker memory limited)
```bash
# Step 1: Build locally
pnpm build

# Step 2: Build Docker image
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

### Low Memory (Slowest, safest)
```bash
./docker-build.sh berry-realm low-memory
```

---

## Verification Checklist

Before building:
- [ ] Docker memory ≥ 10GB
- [ ] Docker CPUs ≥ 4
- [ ] Dockerfile uses `node:22-alpine`
- [ ] Dockerfile includes `git` in apk packages
- [ ] Dockerfile has `corepack prepare pnpm@10.30.1`
- [ ] package.json has `"packageManager": "pnpm@10.30.1"`
- [ ] next.config.ts has `transpilePackages: ['mermaid']`
- [ ] .npmrc has `public-hoist-pattern[]=*mermaid*`
- [ ] .dockerignore exists

After building:
- [ ] Build completes without errors
- [ ] Image size ~1-2GB
- [ ] Container starts successfully
- [ ] App accessible on http://localhost:3000

---

## Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Memory   | 10GB    | 12GB        |
| CPU      | 4 cores | 6+ cores    |
| Disk     | 20GB    | 50GB        |
| Build Time | 10-20 min | 10-15 min |

---

## Support Files

- **Detailed troubleshooting:** `DOCKER_BUILD_FIX.md`
- **Complete summary:** `DOCKER_FIXES_SUMMARY.md`
- **Quick start guide:** `DOCKER_QUICK_START.md`
- **Test checklist:** `BUILD_TEST_CHECKLIST.md`
- **Mermaid issues:** `MERMAID_FIX.md`

---

## Emergency Rollback

```bash
# Revert all changes
git checkout HEAD -- Dockerfile next.config.ts .npmrc package.json

# Reinstall
pnpm install

# Rebuild
pnpm build
```

---

## Contact & Support

If issues persist after trying all fixes:
1. Check all documentation files listed above
2. Verify Docker resources are sufficient
3. Try pre-built artifacts method
4. Check Docker and Node.js versions
5. Review error logs carefully
