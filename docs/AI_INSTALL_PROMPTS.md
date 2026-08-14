# AI 安装引导提示词

> 本文件提供两套「可直接复制粘贴给 AI 助手（TraeCode / Claude / Cursor 等）」的安装提示词，让 AI 替你一步步完成本项目（BerryRealm · 莓界）的安装与验证。
>
> **使用方法**：按你的场景选择下方「本地测试」或「云服务器」提示词，整体复制后在 AI 会话中粘贴，AI 会自行检查环境、执行命令、并在出错时分析修复。

---

## 一、本地测试安装提示词

```
请帮我在本机安装并运行一个开源项目：BerryRealm（莓界）智慧农业 AIoT 平台。

【项目信息】
- 仓库：https://github.com/AcutaCM/BerryRealm-NewGen-AIOT-Platform.git
- 技术栈：Next.js 16（App Router）+ React 19 + TypeScript、Ant Design 6、Prisma 7 + PostgreSQL、MQTT、WebSocket
- 包管理器：pnpm（packageManager 为 pnpm@10.30.1）
- 数据库：PostgreSQL 14+（可通过 Docker 启动）

【目标】
在本地完成可运行的开发环境，访问 http://localhost:3000 能正常打开应用。

【请按以下步骤执行，并逐项确认】
1. 环境检查：确认本机已安装 Node.js（v20+）、pnpm（v10+）、Docker 与 Docker Compose。
   若缺失，先给出对应系统的安装命令并执行。
2. 克隆仓库到本地合适目录，并 cd 进入项目根目录。
3. 执行 pnpm install 安装依赖（如遇网络问题，可配置 pnpm 使用 npmmirror 镜像）。
4. 复制环境变量模板：cp .env.example .env
   然后编辑 .env，至少配置：
   - JWT_SECRET（用 openssl rand -hex 48 生成）
   - DATABASE_URL（指向本地 PostgreSQL，格式 postgresql://postgres:密码@localhost:5432/berry_realm）
   - POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD
   - AI 相关：DASHSCOPE_API_KEY、SYSTEM_OPENAI_API_KEY、SYSTEM_OPENAI_BASE_URL（可先留空，但需说明）
5. 启动数据库：若本机没有 PostgreSQL，用 Docker 启动一个（docker compose up -d db 或 docker run 一个 postgres:16 容器），
   确保 DATABASE_URL 能连通。
6. 执行数据库迁移：npx prisma migrate dev
7. 启动服务：
   - 终端 A：pnpm dev（Next.js 前端，默认 3000 端口）
   - 终端 B：pnpm dev:ws（WebSocket 服务，语音/协同）
8. 验证：打开 http://localhost:3000，确认页面正常渲染、无控制台报错。

【注意事项】
- 每步执行前先向用户说明将要做什么；失败时读取报错并自动分析修复，不要盲目重试。
- 不要使用 tsc 做类型检查；以实际运行是否成功为准。
- 项目使用 middleware/proxy 相关文件按现状保留，不要改动。
- 完成后给出一份简短的安装结果说明（已装版本、启动方式、访问地址、还缺哪些可选配置）。
```

---

## 二、云服务器安装提示词

```
请帮我在一台云服务器上部署并运行开源项目：BerryRealm（莓界）智慧农业 AIoT 平台。

【项目信息】
- 仓库：https://github.com/AcutaCM/BerryRealm-NewGen-AIOT-Platform.git
- 技术栈：Next.js 16 + React 19 + TypeScript、Ant Design 6、Prisma 7 + PostgreSQL、MQTT、WebSocket
- 部署方式：Docker Compose 一键编排（docker-compose.yml），包含 web / db / yjs-ws / onlyoffice / nginx 五个服务
- 服务器建议：Ubuntu 22.04，内存 ≥ 4GB（因为 Next.js 构建需要约 3GB 内存）

【目标】
在云服务器上完成生产部署，能通过域名（HTTPS）访问应用，且服务开机自启。

【请按以下步骤执行，并逐项确认】
1. 系统准备：确认是 Ubuntu 22.04；更新系统（apt update && apt upgrade）。
2. 安装 Docker 与 Docker Compose 插件（docker-ce + docker-compose-plugin）。
   - 配置 Docker 国内镜像加速（写入 /etc/docker/daemon.json 的 registry-mirrors，例如 daocloud 地址）。
   - 设置 systemctl enable docker 开机自启。
3. 安装必要工具：git、openssl、curl。
4. 克隆仓库到服务器（如 ~/berry-realm），cd 进入。
5. 复制环境变量：cp .env.example .env，并编辑 .env 填入生产配置：
   - JWT_SECRET、INTERNAL_API_SECRET（openssl rand 生成）
   - POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD
   - DATABASE_URL=postgresql://postgres:密码@db:5432/stravision（容器内 host 固定为 db）
   - MQTT_HOST / MQTT_PORT / MQTT_USERNAME / MQTT_PASSWORD
   - DASHSCOPE_API_KEY、SYSTEM_OPENAI_API_KEY、SYSTEM_OPENAI_BASE_URL
   - WEATHER_API_KEY
   - APP_URL 与 NEXT_PUBLIC_APP_URL 设为生产域名（https://你的域名）
   - ONLYOFFICE_JWT_SECRET（生产必须设置非空值）
6. 域名的域名解析已指向服务器公网 IP（提醒用户确认）；准备 HTTPS 证书：
   - 将证书放到 nginx/certs/，文件名与 nginx/nginx.conf 中一致（stravision.site_bundle.crt / stravision.site.key）。
   - 若无证书，可用 certbot 通过 Let's Encrypt 签发，或先用一键脚本生成自签证书占位。
7. 构建并启动：
   - 推荐运行仓库内的 ./deploy.sh（自动清理缓存、构建并 up -d）。
   - 或手动执行：docker compose build --no-cache && docker compose up -d。
   - 因仓库较大且含媒体资源，构建时间较长，请耐心等待并监控进度。
8. 初始化数据库：docker compose exec web npx prisma migrate deploy
9. 配置防火墙/安全组：放行 80、443、22 端口（云控制台安全组 + 服务器 ufw）。
   再次提醒用户确认云厂商安全组已放行这些端口。
10. 验证部署：
    - docker compose ps 确认所有容器 Up。
    - curl http://localhost/api/health 应返回正常。
    - 浏览器访问 https://你的域名 确认页面可打开、HTTPS 正常。
    - docker compose logs -f web 确认无致命错误。

【注意事项】
- 构建时若内存不足导致 OOM，改用 build-low-memory.sh 或调大 NODE_OPTIONS=--max-old-space-size，并确保 ≥4GB 内存。
- 每步执行前告知用户；失败时读取报错并分析修复。
- 不要修改 docker-compose.yml / nginx.conf 的既有结构。
- 提醒用户：仓库中两个超大天气视频（lightrain.mp4、snow.mp4）已从 git 移除，如需完整天气背景功能需另行用 LFS 或压缩后补充。
- 完成后输出一份部署摘要：访问地址、容器状态、日志位置、备份建议（每日 pg_dump）。
```

---

## 附：安装后必做检查

| 项目 | 说明 |
| --- | --- |
| 数据库 | `npx prisma migrate` 已执行，无 pending 迁移 |
| 语音 / 协同 | WebSocket 服务（dev:ws 或容器内 3002）正常运行 |
| AI 能力 | 已在 .env 配置至少一个 AI Provider，否则 AI 助手不可用 |
| 登录 | 用注册账号或 `pnpm create:demo` 创建演示账号验证登录闭环 |
| 备份 | 生产部署建议配置每日 `pg_dump` 定时备份 |