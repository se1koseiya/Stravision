# Docker Build Memory Issue Fix

## Problem
Docker build fails with `SIGKILL` after ~18 minutes during `npm run build`, indicating the build process is running out of memory.

## Root Causes
1. **Wrong package manager**: Dockerfile was using npm but project uses pnpm
2. **Node.js version mismatch**: pnpm 10.30.1+ requires Node.js 18.12+ (using Node.js 22 for future compatibility)
3. **Missing git**: GitHub dependencies require git to be installed
4. **Insufficient memory**: 4GB limit too low for large Next.js + Turbopack builds
5. **Large build context**: Unnecessary files being copied to Docker
6. **No build optimization**: Missing environment variables to reduce memory usage

## Solutions Applied

### 1. Updated Dockerfile
- ✅ Upgraded to Node.js 22 (required for pnpm 10.30.1+)
- ✅ Switched from npm to pnpm (matches project setup)
- ✅ Pinned pnpm version to 10.30.1 (matches package.json)
- ✅ Added git (required for GitHub dependencies like @nanostores/react)
- ✅ Increased memory limit from 4GB to 8GB (`NODE_OPTIONS="--max-old-space-size=8192"`)
- ✅ Added `GENERATE_SOURCEMAP=false` to reduce memory usage
- ✅ Used `--frozen-lockfile` for faster, deterministic installs

### 2. Created .dockerignore
- ✅ Excludes node_modules, .next, tests, and other unnecessary files
- ✅ Reduces build context size significantly
- ✅ Speeds up COPY operations

### 3. Docker Build Resource Allocation

When building, ensure Docker has enough resources:

**Docker Desktop Settings:**
- Memory: At least 10GB (12GB recommended)
- CPU: At least 4 cores (6+ recommended)
- Swap: At least 2GB

**Linux/Server:**
```bash
# Check available memory
free -h

# If building on a server with limited memory, use build arguments:
docker build \
  --memory=10g \
  --memory-swap=12g \
  --cpus=4 \
  -t your-image-name .
```

### 4. Alternative: Multi-stage Build with Caching

If memory is still an issue, build with BuildKit caching:

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build with cache mount (faster subsequent builds)
docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --memory=10g \
  -t your-image-name .
```

### 5. Alternative: Build Outside Docker

If Docker memory limits are a constraint:

```bash
# Build locally first
pnpm build

# Then use a simpler Dockerfile that just copies the built artifacts
# (Create Dockerfile.prebuilt for this approach)
```

## Verification Steps

1. **Check Docker resources:**
   ```bash
   docker info | grep -i memory
   docker info | grep -i cpu
   ```

2. **Build with verbose output:**
   ```bash
   docker build --progress=plain -t your-image-name .
   ```

3. **Monitor build process:**
   ```bash
   # In another terminal
   docker stats
   ```

## Expected Build Time
- First build: 10-20 minutes (depending on hardware)
- Subsequent builds with cache: 2-5 minutes

## Troubleshooting

### Still getting SIGKILL?

1. **Increase Docker memory allocation** (Docker Desktop → Settings → Resources)

2. **Use swap space:**
   ```bash
   docker build --memory=8g --memory-swap=10g -t your-image-name .
   ```

3. **Disable Turbopack** (use webpack instead):
   Add to `next.config.ts`:
   ```typescript
   experimental: {
     turbo: false,
   }
   ```
   Then build with: `pnpm build --webpack`

4. **Split the build:**
   ```bash
   # Build dependencies stage only
   docker build --target deps -t your-image-deps .
   
   # Then build the full image
   docker build -t your-image-name .
   ```

### Build is too slow?

1. **Use .dockerignore** (already created)
2. **Enable BuildKit caching** (see above)
3. **Use a faster registry mirror** (already configured in Dockerfile)

## Production Deployment

For production, consider:

1. **Build on CI/CD** with adequate resources (GitHub Actions, GitLab CI, etc.)
2. **Use cloud build services** (Google Cloud Build, AWS CodeBuild)
3. **Pre-build and push to registry**, then deploy the image

## Docker Compose Example

```yaml
version: '3.8'
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_OPTIONS: "--max-old-space-size=8192"
    deploy:
      resources:
        limits:
          memory: 10G
        reservations:
          memory: 8G
    ports:
      - "3000:3000"
      - "3002:3002"
```

## References
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Build Memory Management](https://docs.docker.com/config/containers/resource_constraints/)
- [pnpm in Docker](https://pnpm.io/docker)
