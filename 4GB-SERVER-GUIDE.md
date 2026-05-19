# 4GB内存服务器构建指南

## 问题
在4GB内存的服务器上运行 `pnpm build` 会卡住或失败，因为Next.js + Turbopack需要大量内存。

## 解决方案总览

| 方案 | 难度 | 构建时间 | 成功率 | 推荐度 |
|------|------|----------|--------|--------|
| 1. 增加Swap | 简单 | 20-40分钟 | ⭐⭐⭐⭐⭐ | ✅ 最推荐 |
| 2. 使用Webpack | 简单 | 15-30分钟 | ⭐⭐⭐⭐ | ✅ 推荐 |
| 3. 本地构建 | 中等 | 5-10分钟 | ⭐⭐⭐⭐⭐ | ✅ 推荐 |
| 4. 云端构建 | 简单 | 10-20分钟 | ⭐⭐⭐⭐⭐ | ✅ 推荐 |
| 5. 升级服务器 | 简单 | 10-20分钟 | ⭐⭐⭐⭐⭐ | 💰 需要费用 |

---

## 方案1: 增加Swap空间 (最推荐)

### Linux服务器

```bash
# 1. 运行自动配置脚本
sudo bash setup-swap.sh

# 2. 验证swap
free -h
swapon --show

# 3. 构建
bash build-low-memory.sh
```

### 手动配置Swap

```bash
# 创建4GB swap文件
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 验证
free -h

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 优化swappiness
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### 构建

```bash
# 使用低内存构建脚本
bash build-low-memory.sh

# 或手动构建
export NODE_OPTIONS="--max-old-space-size=3072"
export GENERATE_SOURCEMAP=false
pnpm build --webpack
```

**优点:**
- ✅ 不需要额外硬件
- ✅ 构建成功率高
- ✅ 一次配置，永久有效

**缺点:**
- ⚠️ 构建速度较慢（20-40分钟）
- ⚠️ 需要root权限

---

## 方案2: 使用Webpack代替Turbopack

Webpack比Turbopack使用更少的内存，但构建速度稍慢。

### 方法A: 使用构建脚本

```bash
# Linux/Mac
bash build-low-memory.sh

# Windows
.\build-low-memory.ps1
```

### 方法B: 手动构建

```bash
# 设置环境变量
export NODE_OPTIONS="--max-old-space-size=3072"
export GENERATE_SOURCEMAP=false

# 清理旧构建
rm -rf .next node_modules/.cache

# 使用webpack构建
pnpm build --webpack
```

### 方法C: 修改package.json

```json
{
  "scripts": {
    "build": "next build --webpack",
    "build:turbo": "next build"
  }
}
```

**优点:**
- ✅ 不需要额外配置
- ✅ 内存使用更低
- ✅ 适合4GB服务器

**缺点:**
- ⚠️ 构建时间较长（15-30分钟）

---

## 方案3: 本地构建后上传 (推荐)

在本地或高配置机器上构建，然后上传到服务器。

### 步骤

```bash
# 1. 本地构建
pnpm build

# 2. 打包构建产物
tar -czf build.tar.gz .next public package.json pnpm-lock.yaml node_modules server .agents

# 3. 上传到服务器
scp build.tar.gz user@server:/path/to/app/

# 4. 服务器上解压
ssh user@server
cd /path/to/app
tar -xzf build.tar.gz

# 5. 启动
pnpm start
```

### 使用Docker (更简单)

```bash
# 1. 本地构建
pnpm build

# 2. 使用预构建Dockerfile
docker build -t berry-realm:latest -f Dockerfile.prebuilt .

# 3. 导出镜像
docker save berry-realm:latest | gzip > berry-realm.tar.gz

# 4. 上传到服务器
scp berry-realm.tar.gz user@server:/tmp/

# 5. 服务器上加载
ssh user@server
docker load < /tmp/berry-realm.tar.gz
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

**优点:**
- ✅ 构建速度快（5-10分钟）
- ✅ 不占用服务器资源
- ✅ 成功率100%

**缺点:**
- ⚠️ 需要本地有足够配置
- ⚠️ 需要上传大文件（~500MB-1GB）

---

## 方案4: 使用云端构建服务

### GitHub Actions (免费)

创建 `.github/workflows/build.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 10.30.1
      
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
      
      - name: Upload build
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: |
            .next
            public
            node_modules
```

### Vercel (推荐，免费)

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel --prod
```

### Railway / Render / Fly.io

这些平台提供免费的构建服务器，内存充足。

**优点:**
- ✅ 不占用本地/服务器资源
- ✅ 构建速度快
- ✅ 自动化部署

**缺点:**
- ⚠️ 需要配置CI/CD
- ⚠️ 可能需要公开仓库

---

## 方案5: 升级服务器内存

### 推荐配置

- **最低:** 8GB RAM (舒适构建)
- **推荐:** 16GB RAM (快速构建)
- **理想:** 32GB RAM (大型项目)

### 云服务器价格参考

| 提供商 | 配置 | 价格/月 |
|--------|------|---------|
| 阿里云 | 2核8GB | ¥100-150 |
| 腾讯云 | 2核8GB | ¥100-150 |
| Vultr | 2核8GB | $24 |
| DigitalOcean | 2核8GB | $24 |

---

## Docker构建 (4GB服务器)

### 使用低内存Dockerfile

```bash
# 构建
docker build \
  --memory=3.5g \
  --memory-swap=7g \
  --cpus=2 \
  -t berry-realm:latest \
  -f Dockerfile.low-memory \
  .

# 运行
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

### 注意事项

1. **必须配置swap:** Docker需要swap才能使用超过物理内存
2. **构建时间长:** 预计30-60分钟
3. **可能失败:** 如果系统内存不足仍可能失败

---

## 优化建议

### 1. 关闭不必要的服务

```bash
# 查看内存使用
free -h
ps aux --sort=-%mem | head -10

# 停止不必要的服务
sudo systemctl stop nginx  # 构建时临时停止
sudo systemctl stop mysql
```

### 2. 清理缓存

```bash
# 清理pnpm缓存
pnpm store prune

# 清理Next.js缓存
rm -rf .next node_modules/.cache

# 清理系统缓存
sudo sync && sudo sysctl -w vm.drop_caches=3
```

### 3. 监控内存使用

```bash
# 实时监控
watch -n 1 free -h

# 或使用htop
htop
```

---

## 故障排除

### 构建卡住不动

**原因:** 内存不足，系统在swap

**解决:**
1. 等待（可能需要30-60分钟）
2. 增加swap空间
3. 使用方案3或4

### 构建失败: "JavaScript heap out of memory"

**解决:**
```bash
# 降低内存限制
export NODE_OPTIONS="--max-old-space-size=2560"

# 或使用webpack
pnpm build --webpack
```

### 服务器无响应

**原因:** 内存耗尽，系统卡死

**解决:**
1. 重启服务器
2. 配置swap后再试
3. 使用方案3或4

---

## 推荐方案组合

### 开发环境
1. 本地构建 (方案3)
2. 上传到服务器运行

### 生产环境
1. 配置Swap (方案1)
2. 使用Webpack构建 (方案2)
3. 或使用CI/CD (方案4)

### 最佳实践
1. 使用GitHub Actions构建
2. 推送Docker镜像到Registry
3. 服务器直接拉取镜像运行

---

## 总结

**4GB服务器可以构建，但需要:**
1. ✅ 配置4GB Swap空间
2. ✅ 使用Webpack代替Turbopack
3. ✅ 降低Node.js内存限制到3GB
4. ✅ 关闭其他服务
5. ✅ 耐心等待（20-40分钟）

**更好的选择:**
1. 🚀 本地构建后上传
2. 🚀 使用CI/CD服务
3. 🚀 升级到8GB服务器

**不推荐:**
- ❌ 不配置swap直接构建
- ❌ 使用Turbopack (内存占用高)
- ❌ 同时运行其他服务

---

## 快速开始

```bash
# 1. 配置swap (一次性)
sudo bash setup-swap.sh

# 2. 构建
bash build-low-memory.sh

# 3. 运行
pnpm start
```

就这么简单！
