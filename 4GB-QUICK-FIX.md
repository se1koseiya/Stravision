# 4GB服务器快速修复指南

## 🚨 问题
`pnpm build` 在4GB内存服务器上卡住或失败

---

## ⚡ 最快解决方案

### 方案A: 增加Swap (推荐)

```bash
# 1. 创建swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. 验证
free -h

# 3. 构建
export NODE_OPTIONS="--max-old-space-size=3072"
pnpm build --webpack
```

### 方案B: 使用构建脚本

```bash
# Linux
bash build-low-memory.sh

# Windows
.\build-low-memory.ps1
```

### 方案C: 本地构建上传

```bash
# 本地
pnpm build
tar -czf build.tar.gz .next public node_modules package.json server .agents

# 上传
scp build.tar.gz user@server:/app/

# 服务器
tar -xzf build.tar.gz
pnpm start
```

---

## 📋 详细步骤

### 1. 配置Swap (一次性)

```bash
sudo bash setup-swap.sh
```

### 2. 构建

```bash
bash build-low-memory.sh
```

### 3. 运行

```bash
pnpm start
```

---

## 🐳 Docker构建

### 选择正确的 Dockerfile

```bash
# 如果服务器有 8GB+ 内存
docker build -t berry-realm:latest .

# 如果服务器只有 4GB 内存
./docker-build.sh berry-realm low-memory

# 如果本地已经构建好 (最快)
pnpm build  # 先构建
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

### ⚠️ 常见错误

**错误: `"/.next": not found`**

原因: 使用了 `Dockerfile.prebuilt` 但没有先运行 `pnpm build`

解决:
```bash
# 方法1: 先本地构建
pnpm build
docker build -t berry-realm:latest -f Dockerfile.prebuilt .

# 方法2: 使用标准 Dockerfile
docker build -t berry-realm:latest .
```

---

## 💡 关键设置

```bash
# 环境变量
export NODE_OPTIONS="--max-old-space-size=3072"  # 3GB内存
export GENERATE_SOURCEMAP=false                   # 禁用sourcemap
export NEXT_TELEMETRY_DISABLED=1                  # 禁用遥测

# 使用webpack (更省内存)
pnpm build --webpack
```

---

## 🔍 监控构建

```bash
# 实时查看内存
watch -n 1 free -h

# 或
htop
```

---

## ⚠️ 注意事项

1. **必须配置swap** - 否则会失败
2. **构建时间长** - 20-40分钟是正常的
3. **关闭其他服务** - 释放更多内存
4. **耐心等待** - 不要中断构建

---

## 🆘 如果还是失败

### 选项1: 升级服务器
- 推荐: 8GB内存
- 价格: ¥100-150/月

### 选项2: 使用CI/CD
```bash
# GitHub Actions (免费)
# 自动构建，不占用服务器资源
```

### 选项3: 本地构建
```bash
# 在本地构建后上传
# 最可靠的方法
```

---

## 📚 完整文档

详细说明请查看: `4GB-SERVER-GUIDE.md`

---

## ✅ 成功标志

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Route (app)                              Size
┌ ○ /                                    ...
└ ...
```

---

## 🎯 推荐配置

**最佳实践:**
1. 配置4GB Swap
2. 使用Webpack构建
3. 关闭其他服务
4. 监控内存使用

**长期方案:**
- 升级到8GB服务器
- 或使用CI/CD自动构建
