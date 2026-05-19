# Docker Quick Start Guide

## Prerequisites

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
2. **Minimum Resources:**
   - Memory: 10GB
   - CPU: 4 cores
   - Disk: 20GB free space

## Configure Docker Resources

### Docker Desktop (Windows/Mac)
1. Open Docker Desktop
2. Go to Settings → Resources
3. Set:
   - Memory: 10GB (or more)
   - CPUs: 4 (or more)
   - Swap: 2GB
4. Click "Apply & Restart"

### Linux
Docker uses host resources by default. Ensure your system has at least 10GB RAM available.

## Build Options

### Option 1: Normal Build (Recommended)
Builds everything inside Docker with optimized settings.

**Windows (PowerShell):**
```powershell
.\docker-build.ps1 -ImageName "berry-realm" -BuildType "normal"
```

**Linux/Mac (Bash):**
```bash
chmod +x docker-build.sh
./docker-build.sh berry-realm normal
```

**Manual:**
```bash
docker build --memory=10g --memory-swap=12g --cpus=4 -t berry-realm:latest .
```

### Option 2: Pre-built Artifacts (Fastest)
Build locally first, then create a lightweight Docker image.

**Step 1: Build locally**
```bash
pnpm build
```

**Step 2: Build Docker image**
```powershell
# Windows
.\docker-build.ps1 -ImageName "berry-realm" -BuildType "prebuilt"

# Linux/Mac
./docker-build.sh berry-realm prebuilt
```

### Option 3: Low Memory Build (Slowest but safest)
For systems with limited resources (6-8GB RAM).

```powershell
# Windows
.\docker-build.ps1 -ImageName "berry-realm" -BuildType "low-memory"

# Linux/Mac
./docker-build.sh berry-realm low-memory
```

## Run the Container

### Basic Run
```bash
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

### With Environment Variables
```bash
docker run \
  -p 3000:3000 \
  -p 3002:3002 \
  -e DATABASE_URL="your-database-url" \
  -e OPENAI_API_KEY="your-api-key" \
  berry-realm:latest
```

### With Volume Mounts (Persistent Data)
```bash
docker run \
  -p 3000:3000 \
  -p 3002:3002 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/public/uploads \
  berry-realm:latest
```

### Docker Compose (Recommended for Production)
```bash
docker-compose up -d
```

## Troubleshooting

### Build fails with SIGKILL
**Cause:** Out of memory

**Solutions:**
1. Increase Docker memory allocation (see Configure Docker Resources above)
2. Use pre-built artifacts method (Option 2)
3. Use low-memory build (Option 3)
4. Close other applications to free up RAM

### Build is very slow
**Cause:** Limited CPU or disk I/O

**Solutions:**
1. Increase CPU allocation in Docker Desktop
2. Use SSD instead of HDD
3. Use pre-built artifacts method (Option 2)
4. Enable BuildKit caching (already enabled in scripts)

### "Cannot connect to Docker daemon"
**Cause:** Docker is not running

**Solution:**
1. Start Docker Desktop (Windows/Mac)
2. Start Docker service: `sudo systemctl start docker` (Linux)

### "No space left on device"
**Cause:** Docker disk space full

**Solution:**
```bash
# Clean up unused images and containers
docker system prune -a

# Check disk usage
docker system df
```

### Build succeeds but container crashes
**Cause:** Missing environment variables or database

**Solution:**
1. Check logs: `docker logs <container-id>`
2. Ensure all required environment variables are set
3. Verify database is accessible from container

## Monitoring Build Progress

### View detailed build logs
```bash
docker build --progress=plain -t berry-realm:latest .
```

### Monitor resource usage during build
```bash
# In another terminal
docker stats
```

### Check Docker system info
```bash
docker info
docker system df
```

## Production Deployment

### Using Docker Compose
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  web:
    image: berry-realm:latest
    ports:
      - "3000:3000"
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/public/uploads
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

Then run:
```bash
docker-compose up -d
```

### Push to Registry
```bash
# Tag the image
docker tag berry-realm:latest your-registry.com/berry-realm:latest

# Push to registry
docker push your-registry.com/berry-realm:latest
```

## Next Steps

1. ✅ Build the Docker image using one of the methods above
2. ✅ Test the container locally
3. ✅ Configure environment variables
4. ✅ Set up persistent volumes for data
5. ✅ Deploy to production (Docker Compose, Kubernetes, etc.)

## Support

If you encounter issues:
1. Check `DOCKER_BUILD_FIX.md` for detailed troubleshooting
2. Review Docker logs: `docker logs <container-id>`
3. Verify Docker resources are sufficient
4. Try the pre-built artifacts method if memory is limited
