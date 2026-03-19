#!/bin/bash

# setup-cloudflare-certs.sh

CERT_PATH="nginx/certs/stravision.cheesestrawberry.top_bundle.crt"
KEY_PATH="nginx/certs/stravision.cheesestrawberry.top.key"
CERT_DIR="nginx/certs"

# Colors for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Create cert directory if it doesn't exist
if [ ! -d "$CERT_DIR" ]; then
    mkdir -p "$CERT_DIR"
fi

echo -e "${CYAN}========================================================${NC}"
echo -e "${CYAN}      Cloudflare 生产环境证书配置脚本 (Linux版)${NC}"
echo -e "${CYAN}========================================================${NC}"
echo ""
echo -e "${GRAY}说明：此脚本将帮助您快速配置 Cloudflare 的 Origin 证书和私钥。${NC}"
echo -e "${GRAY}这些文件将被保存到 nginx/certs/ 目录下，供 Nginx 容器使用。${NC}"
echo ""

# 输入证书
echo -e "${YELLOW}第一步: 请粘贴您的 Cloudflare 源服务器证书 (Origin Certificate)${NC}"
echo -e "${GRAY}   (内容应该包含 -----BEGIN CERTIFICATE----- 及 -----END CERTIFICATE-----)${NC}"
echo -e "${RED}   粘贴完成后，请按下回车，在此新行输入 EOF 并按回车结束输入：${NC}"

CERT_CONTENT=""
while true; do
    read -r line
    if [[ "${line^^}" == "EOF" ]]; then
        break
    fi
    if [[ -n "$line" ]]; then
        CERT_CONTENT+="$line"$'\n'
    fi
done

if [ -z "$CERT_CONTENT" ]; then
    echo -e "${RED}错误: 未读取到任何证书内容。脚本已退出。${NC}"
    exit 1
fi

echo -n "$CERT_CONTENT" > "$CERT_PATH"
echo -e "${GREEN}证书已成功保存至 $CERT_PATH${NC}"
echo ""

# 输入私钥
echo -e "${YELLOW}第二步: 请粘贴您的 Cloudflare 私钥 (Private Key)${NC}"
echo -e "${GRAY}   (内容应该包含 -----BEGIN PRIVATE KEY----- 及 -----END PRIVATE KEY-----)${NC}"
echo -e "${RED}   粘贴完成后，请按下回车，在此新行输入 EOF 并按回车结束输入：${NC}"

KEY_CONTENT=""
while true; do
    read -r line
    if [[ "${line^^}" == "EOF" ]]; then
        break
    fi
    if [[ -n "$line" ]]; then
        KEY_CONTENT+="$line"$'\n'
    fi
done

if [ -z "$KEY_CONTENT" ]; then
    echo -e "${RED}错误: 未读取到任何私钥内容。脚本已退出。${NC}"
    exit 1
fi

echo -n "$KEY_CONTENT" > "$KEY_PATH"
echo -e "${GREEN}私钥已成功保存至 $KEY_PATH${NC}"
echo ""

echo -e "${CYAN}========================================================${NC}"
echo -e "${GREEN}配置完成！您的 Cloudflare 证书已准备就绪。${NC}"
echo -e "${YELLOW}请确保您在 Cloudflare 仪表板中将 SSL/TLS 加密模式设置为 '完全(严格) / Full (strict)'。${NC}"
echo -e "${GRAY}最后，您可能需要重启 Nginx 容器以加载新证书：${NC}"
echo -e "  docker-compose restart nginx"
echo -e "${CYAN}========================================================${NC}"
