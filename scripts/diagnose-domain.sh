#!/bin/bash

# 域名访问诊断脚本
# 用于快速诊断域名访问问题

DOMAIN="stravision.cheesestrawberry.top"
COLORS=true

# 颜色定义
if [ "$COLORS" = true ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  域名访问诊断工具${NC}"
echo -e "${BLUE}  Domain: $DOMAIN${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 1. DNS 解析检查
echo -e "${YELLOW}[1/8] 检查 DNS 解析...${NC}"
DNS_RESULT=$(nslookup $DOMAIN 2>&1)
if echo "$DNS_RESULT" | grep -q "Address:"; then
    IP=$(echo "$DNS_RESULT" | grep "Address:" | tail -1 | awk '{print $2}')
    echo -e "${GREEN}✓ DNS 解析成功: $IP${NC}"
else
    echo -e "${RED}✗ DNS 解析失败${NC}"
    echo "$DNS_RESULT"
fi
echo ""

# 2. HTTPS 连接检查
echo -e "${YELLOW}[2/8] 检查 HTTPS 连接...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN --max-time 10)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓ HTTPS 连接成功 (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" = "418" ]; then
    echo -e "${RED}✗ 收到 HTTP 418 错误 (I'm a teapot)${NC}"
    echo -e "${YELLOW}  可能原因: Cloudflare Bot 检测或 CDN 配置问题${NC}"
else
    echo -e "${RED}✗ HTTPS 连接失败 (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# 3. SSL 证书检查
echo -e "${YELLOW}[3/8] 检查 SSL 证书...${NC}"
SSL_INFO=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SSL 证书有效${NC}"
    echo "$SSL_INFO" | sed 's/^/  /'
else
    echo -e "${RED}✗ SSL 证书检查失败${NC}"
fi
echo ""

# 4. 响应头检查
echo -e "${YELLOW}[4/8] 检查响应头...${NC}"
HEADERS=$(curl -s -I https://$DOMAIN --max-time 10)
if echo "$HEADERS" | grep -q "Server:"; then
    echo -e "${GREEN}✓ 响应头正常${NC}"
    echo "$HEADERS" | grep -E "Server:|CF-|X-" | sed 's/^/  /'
    
    # 检查是否使用 Cloudflare
    if echo "$HEADERS" | grep -q "CF-"; then
        echo -e "${BLUE}  检测到 Cloudflare CDN${NC}"
    fi
else
    echo -e "${RED}✗ 无法获取响应头${NC}"
fi
echo ""

# 5. 3D 模型资源检查
echo -e "${YELLOW}[5/8] 检查 3D 模型资源...${NC}"
MODEL_URL="https://$DOMAIN/3d_model/scene.gltf"
MODEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" $MODEL_URL --max-time 30)
if [ "$MODEL_CODE" = "200" ]; then
    MODEL_SIZE=$(curl -s -I $MODEL_URL | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
    echo -e "${GREEN}✓ 3D 模型可访问 (HTTP $MODEL_CODE)${NC}"
    if [ -n "$MODEL_SIZE" ]; then
        SIZE_MB=$(echo "scale=2; $MODEL_SIZE / 1024 / 1024" | bc)
        echo -e "  文件大小: ${SIZE_MB} MB"
    fi
else
    echo -e "${RED}✗ 3D 模型无法访问 (HTTP $MODEL_CODE)${NC}"
fi
echo ""

# 6. CORS 检查
echo -e "${YELLOW}[6/8] 检查 CORS 配置...${NC}"
CORS_HEADERS=$(curl -s -I -H "Origin: https://$DOMAIN" $MODEL_URL | grep -i "access-control")
if [ -n "$CORS_HEADERS" ]; then
    echo -e "${GREEN}✓ CORS 配置正常${NC}"
    echo "$CORS_HEADERS" | sed 's/^/  /'
else
    echo -e "${YELLOW}⚠ 未检测到 CORS 头（可能不需要）${NC}"
fi
echo ""

# 7. WebSocket 检查
echo -e "${YELLOW}[7/8] 检查 WebSocket 支持...${NC}"
WS_HEADERS=$(curl -s -I -H "Upgrade: websocket" -H "Connection: Upgrade" https://$DOMAIN/ws/voice)
if echo "$WS_HEADERS" | grep -qi "upgrade"; then
    echo -e "${GREEN}✓ WebSocket 支持正常${NC}"
else
    echo -e "${YELLOW}⚠ WebSocket 支持未确认${NC}"
fi
echo ""

# 8. 响应时间检查
echo -e "${YELLOW}[8/8] 检查响应时间...${NC}"
TIMING=$(curl -w "@-" -o /dev/null -s https://$DOMAIN <<'EOF'
    time_namelookup:  %{time_namelookup}s\n
    time_connect:     %{time_connect}s\n
    time_appconnect:  %{time_appconnect}s\n
    time_pretransfer: %{time_pretransfer}s\n
    time_starttransfer: %{time_starttransfer}s\n
    time_total:       %{time_total}s\n
EOF
)
echo "$TIMING" | sed 's/^/  /'
TOTAL_TIME=$(echo "$TIMING" | grep "time_total" | awk '{print $2}' | sed 's/s//')
if (( $(echo "$TOTAL_TIME < 2" | bc -l) )); then
    echo -e "${GREEN}✓ 响应速度良好${NC}"
elif (( $(echo "$TOTAL_TIME < 5" | bc -l) )); then
    echo -e "${YELLOW}⚠ 响应速度一般${NC}"
else
    echo -e "${RED}✗ 响应速度较慢${NC}"
fi
echo ""

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  诊断完成${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 建议
echo -e "${YELLOW}建议操作:${NC}"
if [ "$HTTP_CODE" = "418" ]; then
    echo -e "  1. 检查 Cloudflare Bot Fight Mode 设置"
    echo -e "  2. 清除 Cloudflare 缓存"
    echo -e "  3. 查看 WAF 规则是否误拦截"
fi

if [ "$MODEL_CODE" != "200" ]; then
    echo -e "  1. 检查 Nginx 静态资源配置"
    echo -e "  2. 确认 3D 模型文件存在"
    echo -e "  3. 检查文件权限"
fi

if (( $(echo "$TOTAL_TIME > 3" | bc -l) )); then
    echo -e "  1. 启用 CDN 加速"
    echo -e "  2. 优化 Nginx 缓存配置"
    echo -e "  3. 压缩静态资源"
fi

echo ""
echo -e "${BLUE}详细修复指南: docs/domain-access-fix.md${NC}"
