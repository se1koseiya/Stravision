#!/bin/bash
# Start Voice Service for local development
# This script starts the Python voice service on port 8000

set -e

echo -e "\033[36mStarting Voice Service...\033[0m"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "\033[31mPython3 is not installed. Please install Python 3.10+ first.\033[0m"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "\033[32mFound $PYTHON_VERSION\033[0m"

# Navigate to python_service directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PYTHON_SERVICE_DIR="$PROJECT_ROOT/python_service"

cd "$PYTHON_SERVICE_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "\033[33mCreating virtual environment...\033[0m"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo -e "\033[33mInstalling dependencies...\033[0m"
pip install -r requirements.txt -q

# Check for DASHSCOPE_API_KEY
if [ -z "$DASHSCOPE_API_KEY" ]; then
    # Try to load from .env.local
    ENV_FILE="$PROJECT_ROOT/.env.local"
    if [ -f "$ENV_FILE" ]; then
        export $(grep -E "^DASHSCOPE_API_KEY=" "$ENV_FILE" | xargs)
    fi
fi

if [ -z "$DASHSCOPE_API_KEY" ]; then
    echo -e "\033[33mWarning: DASHSCOPE_API_KEY not set. Voice service may not work properly.\033[0m"
fi

# Start the service
echo -e "\033[32mStarting voice service on http://localhost:8000\033[0m"
echo -e "\033[90mPress Ctrl+C to stop\033[0m"
python main.py
