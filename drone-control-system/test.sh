#!/bin/bash
# 测试脚本

echo "=========================================="
echo "  Running Tests"
echo "=========================================="

# 检查pytest
if ! command -v pytest &> /dev/null; then
    echo "Installing pytest..."
    pip3 install pytest pytest-asyncio pytest-cov
fi

# 运行单元测试
echo ""
echo "Running unit tests..."
pytest tests/ -v --tb=short

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ All tests passed"
else
    echo ""
    echo "✗ Some tests failed"
    exit 1
fi

# 运行集成测试
echo ""
echo "Running integration tests..."
python3 tests/integration_test.py

exit $?
