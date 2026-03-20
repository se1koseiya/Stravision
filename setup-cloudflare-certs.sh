#!/bin/sh

# setup-cloudflare-certs.sh (POSIX Compatible Version)

CERT_PATH="nginx/certs/stravision.cheesestrawberry.top_bundle.crt"
KEY_PATH="nginx/certs/stravision.cheesestrawberry.top.key"
CERT_DIR="nginx/certs"

# Colors for printf
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Newline variable
NL='
'

# Create cert directory if it doesn't exist
if [ ! -d "$CERT_DIR" ]; then
    mkdir -p "$CERT_DIR"
fi

printf "${CYAN}========================================================${NC}\n"
printf "${CYAN}      Cloudflare 生产环境证书配置脚本 (通用版)${NC}\n"
printf "${CYAN}========================================================${NC}\n"
printf "\n"
printf "${GRAY}说明：此脚本将帮助您快速配置 Cloudflare 的 Origin 证书和私钥。${NC}\n"
printf "${GRAY}这些文件将被保存到 nginx/certs/ 目录下，供 Nginx 容器使用。${NC}\n"
printf "\n"

# 输入证书
printf "${YELLOW}第一步: 请粘贴您的 Cloudflare 源服务器证书 (Origin Certificate)${NC}\n"
printf "${GRAY}   (内容应该包含 -----BEGIN CERTIFICATE----- 及 -----END CERTIFICATE-----)${NC}\n"
printf "${RED}   粘贴完成后，请按下回车，在此新行输入 EOF 并按回车结束输入：${NC}\n"

CERT_CONTENT=""
while IFS= read -r line || [ -n "$line" ]; do
    clean_line=$(echo "$line" | tr -d '\r')
    # 使用 tr 转换为全大写进行判断
    UPPER_LINE=$(echo "$clean_line" | tr '[:lower:]' '[:upper:]')
    if [ "$UPPER_LINE" = "EOF" ]; then
        break
    fi
    CERT_CONTENT="${CERT_CONTENT}${line}${NL}"
done

if [ -z "$CERT_CONTENT" ]; then
    printf "${RED}错误: 未读取到任何证书内容。脚本已退出。${NC}\n"
    exit 1
fi

printf "%s" "$CERT_CONTENT" > "$CERT_PATH"
printf "${GREEN}证书已成功保存至 $CERT_PATH${NC}\n"
printf "\n"

# 输入私钥
printf "${YELLOW}第二步: 请粘贴您的 Cloudflare 私钥 (Private Key)${NC}\n"
printf "${GRAY}   (内容应该包含 -----BEGIN PRIVATE KEY----- 及 -----END PRIVATE KEY-----)${NC}\n"
printf "${RED}   粘贴完成后，请按下回车，在此新行输入 EOF 并按回车结束输入：${NC}\n"

KEY_CONTENT=""
while IFS= read -r line || [ -n "$line" ]; do
    clean_line=$(echo "$line" | tr -d '\r')
    UPPER_LINE=$(echo "$clean_line" | tr '[:lower:]' '[:upper:]')
    if [ "$UPPER_LINE" = "EOF" ]; then
        break
    fi
    KEY_CONTENT="${KEY_CONTENT}${line}${NL}"
done

if [ -z "$KEY_CONTENT" ]; then
    printf "${RED}错误: 未读取到任何私钥内容。脚本已退出。${NC}\n"
    exit 1
fi

printf "%s" "$KEY_CONTENT" > "$KEY_PATH"
printf "${GREEN}私钥已成功保存至 $KEY_PATH${NC}\n"

printf "\n${CYAN}========================================================${NC}\n"
printf "${GREEN}配置完成！您的 Cloudflare 证书已准备就绪。${NC}\n"
printf "${YELLOW}请确保您在 Cloudflare 仪表板中将 SSL/TLS 加密模式设置为 '完全(严格) / Full (strict)'。${NC}\n"
printf "${GRAY}最后，您可能需要重启 Nginx 容器以加载新证书：${NC}\n"
printf "  docker-compose restart nginx\n"
printf "${CYAN}========================================================${NC}\n"
