#!/bin/bash

# Docker Build Script with Memory Optimization
# Usage: ./docker-build.sh [image-name] [build-type]
# Build types: normal (default), prebuilt, low-memory

set -e

IMAGE_NAME=${1:-"berry-realm"}
BUILD_TYPE=${2:-"normal"}
MEMORY_LIMIT="10g"
MEMORY_SWAP="12g"
CPUS="4"

echo "🐳 Docker Build Script"
echo "======================"
echo "Image name: $IMAGE_NAME"
echo "Build type: $BUILD_TYPE"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Enable BuildKit for better caching
export DOCKER_BUILDKIT=1

case $BUILD_TYPE in
    "normal")
        echo "📦 Building with normal Dockerfile..."
        echo "Memory limit: $MEMORY_LIMIT"
        echo "Memory swap: $MEMORY_SWAP"
        echo "CPUs: $CPUS"
        echo ""
        
        docker build \
            --memory=$MEMORY_LIMIT \
            --memory-swap=$MEMORY_SWAP \
            --cpus=$CPUS \
            --build-arg BUILDKIT_INLINE_CACHE=1 \
            --progress=plain \
            -t $IMAGE_NAME:latest \
            -f Dockerfile \
            .
        ;;
        
    "prebuilt")
        echo "📦 Building with pre-built artifacts..."
        echo ""
        
        # Check if .next directory exists
        if [ ! -d ".next" ]; then
            echo "⚠️  .next directory not found. Building locally first..."
            pnpm build
        fi
        
        docker build \
            --progress=plain \
            -t $IMAGE_NAME:latest \
            -f Dockerfile.prebuilt \
            .
        ;;
        
    "low-memory")
        echo "📦 Building with low memory settings (slower but safer)..."
        echo "Memory limit: 6g"
        echo "Memory swap: 8g"
        echo "CPUs: 2"
        echo ""
        
        docker build \
            --memory=6g \
            --memory-swap=8g \
            --cpus=2 \
            --progress=plain \
            -t $IMAGE_NAME:latest \
            -f Dockerfile \
            .
        ;;
        
    *)
        echo "❌ Unknown build type: $BUILD_TYPE"
        echo "Valid types: normal, prebuilt, low-memory"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📊 Image info:"
    docker images $IMAGE_NAME:latest
    echo ""
    echo "🚀 To run the container:"
    echo "   docker run -p 3000:3000 -p 3002:3002 $IMAGE_NAME:latest"
    echo ""
    echo "🔍 To inspect the image:"
    echo "   docker run --rm -it $IMAGE_NAME:latest sh"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi
