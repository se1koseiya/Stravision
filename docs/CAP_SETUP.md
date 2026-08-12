# Cap 人机行为验证配置教程

本项目使用 [**Cap**](https://trycap.dev/) —— 一个自托管的 proof-of-work CAPTCHA 替代方案。用户点击复选框，浏览器静默完成工作量证明，无需图像拼图、无第三方遥测、无每请求费用，所有数据留在你自己的服务器上。

> **替代关系**：本项目已从早期的 `recaptz`（纯客户端，无服务端校验）→ `Caputchin`（CDN 云服务）迁移到当前的 **Cap（自托管）**。Cap 的 `/siteverify` 接口兼容 reCAPTCHA API。

---

## 架构概览

Cap 由两部分组成：

```
┌─────────────────┐   cap-token   ┌─────────────────┐    siteverify    ┌─────────────────┐
│   浏览器         │ ────────────> │  Next.js 后端    │ ───────────────> │  Cap 容器       │
│  cap-widget     │               │  /api/auth/*    │                  │  (自托管)        │
│ (proof-of-work) │               │  verifyCapToken │ <── { success } ─ │  + Valkey       │
└─────────────────┘               └─────────────────┘                  └─────────────────┘
```

- **前端组件**：`<cap-widget>` 自定义元素，加载 `cap-widget@0.1.53` CDN 脚本，用户点击后通过 `solve` 事件回传 `cap-token`
- **后端校验**：`lib/cap.ts` 的 `verifyCapToken()`，将 token POST 到自托管 Cap 实例的 `/siteverify` 接口
- **Cap 服务**：Docker 容器 `tiago2/cap:latest`，配套 Valkey（Redis 兼容）存储 challenge 状态

---

## 集成位置

本项目在以下场景接入 Cap：

| 场景 | 前端文件 | 后端接口 |
|---|---|---|
| 登录 | `app/login/page.tsx` | `POST /api/auth/login` |
| 注册（获取邮箱验证码前） | `app/register/page.tsx` | `POST /api/auth/send-verification` |
| 超级管理员入口 | `app/super-secure-admin-entry/page.tsx` | `POST /api/auth/login` |

令牌一次性使用：登录/发送验证码失败时会自动重置前端验证状态，用户需重新完成验证。

---

## 一、启动 Cap 服务

### 1.1 配置环境变量

编辑项目根目录的 `.env.local`，找到 Cap 配置段：

```bash
# ---------- Cap 人机行为验证（自托管 proof-of-work CAPTCHA） ----------
NEXT_PUBLIC_CAP_API_ENDPOINT=http://localhost:3100/<site-key>/
CAP_VERIFY_URL=http://cap:3000/<site-key>/siteverify
CAP_SECRET_KEY=
CAP_ADMIN_KEY=
```

**先填 `CAP_ADMIN_KEY`**（≥ 32 字符强密码，用于登录 Cap 控制台）：

```bash
# 示例：用 openssl 生成
openssl rand -base64 32
```

### 1.2 启动 Cap 与 Valkey 容器

```bash
docker compose up -d cap cap-valkey
```

`docker-compose.yml` 中已配置好两个服务：

```yaml
  cap:
    image: tiago2/cap:latest
    container_name: cap
    environment:
      - ADMIN_KEY=${CAP_ADMIN_KEY:-cap_admin_password_change_me_at_least_32_chars}
      - REDIS_URL=redis://cap-valkey:6379
      - TZ=Asia/Shanghai
    ports:
      - "3100:3000"
    depends_on:
      cap-valkey:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  cap-valkey:
    image: valkey/valkey:9-alpine
    container_name: cap-valkey
    volumes:
      - cap-valkey-data:/data
    command: valkey-server --save 60 1 --loglevel warning --maxmemory-policy noeviction
    healthcheck:
      test: ["CMD", "valkey-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network
```

### 1.3 验证 Cap 服务已就绪

```bash
# 检查容器状态
docker compose ps cap cap-valkey

# 访问控制台
# 浏览器打开 http://localhost:3100
# 用 .env.local 中的 CAP_ADMIN_KEY 登录
```

---

## 二、创建 Site Key

1. 浏览器访问 `http://localhost:3100`
2. 用 `CAP_ADMIN_KEY` 登录控制台
3. 点击 **Create Site Key**（创建站点密钥）
4. 复制控制台返回的两个值：
   - **Site Key**：形如 `abc123def456...`（公开，会暴露给浏览器）
   - **Secret Key**：形如 `cpt_sec_xxxxxxxx...`（保密，仅服务端使用）

> ⚠️ **常见错误**：不要把 `ADMIN_KEY`（控制台登录密码）和 `Secret Key`（site key 的密钥）混淆。前者用于登录管理界面，后者用于服务端校验 token。

---

## 三、回填环境变量

拿到 Site Key 和 Secret Key 后，回到 `.env.local` 替换占位符：

```bash
# 浏览器可访问的 Cap 实例地址（含 site-key 路径，末尾必须有斜杠）
# 本地开发：http://localhost:3100/<site-key>/
# 生产环境：https://cap.your-domain.com/<site-key>/
NEXT_PUBLIC_CAP_API_ENDPOINT=http://localhost:3100/abc123def456/

# 服务端校验地址（容器内部访问，含 /siteverify 后缀，末尾无斜杠）
# docker 网络内：http://cap:3000/<site-key>/siteverify
CAP_VERIFY_URL=http://cap:3000/abc123def456/siteverify

# 控制台中该 site key 对应的 secret key（仅服务端，绝不放入浏览器）
CAP_SECRET_KEY=cpt_sec_xxxxxxxxxxxxxxxxxxxxxxxx

# Cap 控制台管理员密码（至少 32 字符）
CAP_ADMIN_KEY=your_strong_password_at_least_32_characters_long
```

### 环境变量说明

| 变量 | 作用 | 暴露范围 | 必填 |
|---|---|---|---|
| `NEXT_PUBLIC_CAP_API_ENDPOINT` | 前端 `<cap-widget>` 的 `data-cap-api-endpoint` 属性 | 浏览器（`NEXT_PUBLIC_` 前缀） | ✅ |
| `CAP_VERIFY_URL` | 服务端 `verifyCapToken()` POST 的完整地址 | 仅服务端 | ✅ |
| `CAP_SECRET_KEY` | Site Key 对应的密钥，用于 `/siteverify` | 仅服务端 | ✅ |
| `CAP_ADMIN_KEY` | Cap 控制台登录密码 | 仅 docker-compose 读取 | ✅ |

---

## 四、重启服务使配置生效

```bash
# 重启 web 容器以加载新的环境变量
docker compose up -d web

# 查看日志确认无报错
docker compose logs -f web | grep -i cap
```

---

## 五、端到端验证

### 5.1 前端流程

1. 浏览器访问 `http://localhost:3000/login`
2. 填入邮箱和密码后，Cap 组件自动展开
3. 点击复选框，浏览器完成 proof-of-work（通常 1-2 秒）
4. 复选框打勾 → 令牌已注入

### 5.2 后端校验

提交表单后，服务端会调用 `verifyCapToken()`：

```typescript
// lib/cap.ts 核心逻辑
const res = await fetch(process.env.CAP_VERIFY_URL, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ secret: process.env.CAP_SECRET_KEY, response: token }),
})
const data = await res.json()
// { success: true } 表示令牌有效
```

### 5.3 手动验证一次性使用

```bash
# 第一次提交（应返回 success: true）
curl "http://localhost:3100/<site-key>/siteverify" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{ "secret": "cpt_sec_xxx", "response": "<your-cap-token>" }'

# 用同一个 token 再次提交（应返回 success: false，证明令牌已失效）
curl "http://localhost:3100/<site-key>/siteverify" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{ "secret": "cpt_sec_xxx", "response": "<same-cap-token>" }'
```

如果两次都返回 `success: true`，说明一次性使用未生效，请检查 `CAP_SECRET_KEY` 是否正确。

---

## 六、生产环境部署

### 6.1 反向代理（推荐）

生产环境建议通过 Nginx 反向代理 Cap，避免直接暴露 3100 端口：

```nginx
# nginx.conf 增加一段
server {
    listen 443 ssl;
    server_name cap.your-domain.com;

    # ssl_certificate     /etc/nginx/certs/your-cert.pem;
    # ssl_certificate_key /etc/nginx/certs/your-key.pem;

    location / {
        proxy_pass http://cap:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

然后将 `NEXT_PUBLIC_CAP_API_ENDPOINT` 改为公网地址：

```bash
NEXT_PUBLIC_CAP_API_ENDPOINT=https://cap.your-domain.com/<site-key>/
# CAP_VERIFY_URL 在容器网络内通信，可保持 http://cap:3000/... 不变
```

### 6.2 安全清单

- [ ] `CAP_ADMIN_KEY` 至少 32 字符，使用 `openssl rand -base64 32` 生成
- [ ] `CAP_SECRET_KEY` 来自 Cap 控制台，**不是** `CAP_ADMIN_KEY`
- [ ] 生产环境通过 HTTPS 反向代理 Cap，不直接暴露 3100 端口
- [ ] `.env.local` 不提交到 Git（已在 `.gitignore` 中）
- [ ] Cap 容器与 web 容器在同一 docker 网络内，`CAP_VERIFY_URL` 用容器名 `cap` 而非 `localhost`
- [ ] 定期在 Cap 控制台轮换 Site Key（旧 token 失效后需更新 `.env.local` 并重启 web）

### 6.3 CORS 配置

如果浏览器跨域访问 Cap（例如前端在 `yidiudiu1.top`，Cap 在 `cap.your-domain.com`），需要在 Cap 控制台为该 Site Key 配置允许的 Origin。详见 [Cap Standalone 配置文档](https://trycap.dev/guide/standalone/options.html)。

---

## 七、故障排查

### 问题 1：前端组件不显示，提示「Cap 未配置」

**原因**：`NEXT_PUBLIC_CAP_API_ENDPOINT` 未设置或为空。

**解决**：在 `.env.local` 中填入正确的值（含 site-key 路径和末尾斜杠），重启 web 容器。

### 问题 2：提交表单时报「缺少人机验证令牌」

**原因**：前端未拿到 token，可能 Cap 服务不可达。

**解决**：
```bash
# 检查 Cap 容器是否运行
docker compose ps cap

# 浏览器控制台查看 cap-widget 的网络请求是否成功
# 确认 NEXT_PUBLIC_CAP_API_ENDPOINT 地址在浏览器中可访问
```

### 问题 3：服务端日志 `[CAP] CAP_VERIFY_URL 或 CAP_SECRET_KEY 未配置`

**原因**：环境变量未传入 web 容器。

**解决**：
```bash
# 确认 docker-compose.yml 中 web 服务有以下三行
- NEXT_PUBLIC_CAP_API_ENDPOINT=${NEXT_PUBLIC_CAP_API_ENDPOINT}
- CAP_VERIFY_URL=${CAP_VERIFY_URL}
- CAP_SECRET_KEY=${CAP_SECRET_KEY}

# 重新启动 web 容器（不是 cap 容器）
docker compose up -d web
```

### 问题 4：`siteverify` 始终返回 `success: false`

**可能原因**：
1. `CAP_SECRET_KEY` 与 `CAP_VERIFY_URL` 中的 site-key 不匹配
2. Token 已被使用过（Cap 令牌一次性）
3. Token 已过期（通常有效期较短）
4. 把 `CAP_ADMIN_KEY` 误填到了 `CAP_SECRET_KEY`

**解决**：在 Cap 控制台核对 site key 与 secret key 的对应关系，重新填入 `.env.local`。

### 问题 5：登录失败后无法重新验证

**预期行为**：登录/发送验证码失败时，前端会自动重置 `captchaCompleted=false` 和 `capToken=""`，用户需重新点击复选框。这是设计如此——令牌一次性使用，失败后必须重新获取。

如果组件未自动重置，刷新页面即可。

---

## 八、相关文件速查

| 类型 | 文件路径 |
|---|---|
| 服务端校验逻辑 | [lib/cap.ts](../lib/cap.ts) |
| 前端组件 | [components/ui/cap-widget.tsx](../components/ui/cap-widget.tsx) |
| 登录页 | [app/login/page.tsx](../app/login/page.tsx) |
| 注册页 | [app/register/page.tsx](../app/register/page.tsx) |
| 管理员入口 | [app/super-secure-admin-entry/page.tsx](../app/super-secure-admin-entry/page.tsx) |
| 登录接口 | [app/api/auth/login/route.ts](../app/api/auth/login/route.ts) |
| 发送验证码接口 | [app/api/auth/send-verification/route.ts](../app/api/auth/send-verification/route.ts) |
| Docker 服务定义 | [docker-compose.yml](../docker-compose.yml)（搜索 `cap:` 和 `cap-valkey:`） |
| 环境变量模板 | [.env.example](../.env.example) |
| 环境变量实际值 | [.env.local](../.env.local)（不提交到 Git） |

---

## 九、官方参考

- **Cap 官网**：https://trycap.dev/
- **快速开始**：https://trycap.dev/guide/
- **Widget 文档**：https://trycap.dev/guide/widget.html
- **Standalone 部署**：https://trycap.dev/guide/standalone/
- **配置选项（CORS / 限流）**：https://trycap.dev/guide/standalone/options.html
- **GitHub 仓库**：https://github.com/tiagozip/cap
- **与 reCAPTCHA/Turnstile/hCaptcha 对比**：https://trycap.dev/guide/alternatives.html

---

## 附：从旧方案迁移注意

如果你之前配置过 `Caputchin` 或 `recaptz`，迁移到 Cap 后请：

1. 删除 `.env.local` 中的旧变量：
   - `NEXT_PUBLIC_CAPUTCHIN_SITEKEY`
   - `CAPUTCHIN_SECRET`
2. 删除 `package.json` 中的 `recaptz` 依赖（如尚未删除）：
   ```bash
   pnpm install
   ```
3. 旧文件 `lib/caputchin.ts`、`components/ui/caputchin-widget.tsx`、`components/ui/recaptz-widget.tsx` 已在迁移中删除，无需手动清理。
