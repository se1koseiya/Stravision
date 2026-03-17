# Resend 域名配置指南

## 为什么需要配置域名？

使用 Resend 测试邮箱 `onboarding@resend.dev` 时，**只能发送到你的 Resend 账号注册邮箱**。

要支持发送到任意邮箱（生产环境必需），你需要：
1. 拥有一个域名
2. 在 Resend 验证该域名
3. 配置 DNS 记录

## 📋 前置要求

- ✅ 拥有一个域名（如：`yourdomain.com`）
- ✅ 能够访问域名的 DNS 管理面板
- ✅ 已注册 Resend 账号

## 🚀 配置步骤

### 步骤 1: 添加域名到 Resend

1. 登录 Resend 控制台
2. 访问 👉 https://resend.com/domains
3. 点击 **"Add Domain"** 按钮
4. 输入你的域名（如：`yourdomain.com`）
5. 点击 **"Add"** 确认

### 步骤 2: 获取 DNS 记录

添加域名后，Resend 会显示需要配置的 DNS 记录，通常包括：

#### SPF 记录（必需）
```
类型: TXT
名称: @
值: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### DKIM 记录（必需）
```
类型: TXT
名称: resend._domainkey
值: [Resend 提供的长字符串]
TTL: 3600
```

#### DMARC 记录（推荐）
```
类型: TXT
名称: _dmarc
值: v=DMARC1; p=none;
TTL: 3600
```

### 步骤 3: 配置 DNS 记录

根据你的域名服务商，配置方式略有不同：

#### 阿里云（万网）

1. 登录 [阿里云控制台](https://dns.console.aliyun.com/)
2. 进入"域名解析"
3. 选择你的域名
4. 点击"添加记录"
5. 按照上述信息添加 TXT 记录

#### 腾讯云 DNSPod

1. 登录 [DNSPod 控制台](https://console.dnspod.cn/)
2. 选择你的域名
3. 点击"添加记录"
4. 记录类型选择"TXT"
5. 填写主机记录和记录值

#### Cloudflare

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的域名
3. 进入"DNS"标签
4. 点击"Add record"
5. Type 选择"TXT"
6. 填写 Name 和 Content

#### GoDaddy

1. 登录 [GoDaddy](https://www.godaddy.com/)
2. 进入"My Products"
3. 找到你的域名，点击"DNS"
4. 点击"Add"添加新记录
5. Type 选择"TXT"
6. 填写 Host 和 TXT Value

#### Namecheap

1. 登录 [Namecheap](https://www.namecheap.com/)
2. 进入"Domain List"
3. 点击"Manage"
4. 进入"Advanced DNS"标签
5. 点击"Add New Record"
6. Type 选择"TXT Record"

### 步骤 4: 等待 DNS 生效

- DNS 记录通常需要 **几分钟到几小时** 生效
- 可以使用在线工具检查 DNS 记录：
  - https://mxtoolbox.com/
  - https://dnschecker.org/

### 步骤 5: 验证域名

1. 返回 Resend 控制台的 Domains 页面
2. 点击你的域名
3. 点击 **"Verify"** 按钮
4. 如果 DNS 记录正确，状态会变为 **"Verified"** ✅

如果验证失败：
- 等待更长时间（最多24小时）
- 检查 DNS 记录是否正确
- 使用 DNS 检查工具验证记录

### 步骤 6: 更新应用配置

在 `.env.local` 中更新发件人邮箱：

```env
# 使用你的域名邮箱
RESEND_FROM_EMAIL=Stravision <noreply@yourdomain.com>

# 或者使用其他邮箱名称
# RESEND_FROM_EMAIL=Stravision <hello@yourdomain.com>
# RESEND_FROM_EMAIL=Stravision <support@yourdomain.com>
```

### 步骤 7: 测试发送

```bash
# 现在可以发送到任何邮箱了！
npm run test:email any-email@example.com
```

## 📊 DNS 记录详解

### SPF (Sender Policy Framework)

**作用**: 防止邮件被标记为垃圾邮件

**记录值**: `v=spf1 include:_spf.resend.com ~all`

**说明**:
- `v=spf1` - SPF 版本
- `include:_spf.resend.com` - 允许 Resend 服务器发送邮件
- `~all` - 软失败策略（推荐）

### DKIM (DomainKeys Identified Mail)

**作用**: 验证邮件来源的真实性

**记录名**: `resend._domainkey`

**记录值**: Resend 提供的公钥（很长的字符串）

**说明**:
- DKIM 使用加密签名验证邮件
- 提高邮件送达率
- 防止邮件被篡改

### DMARC (Domain-based Message Authentication)

**作用**: 定义 SPF 和 DKIM 验证失败时的处理策略

**记录值**: `v=DMARC1; p=none;`

**策略选项**:
- `p=none` - 不采取行动（推荐初期使用）
- `p=quarantine` - 标记为垃圾邮件
- `p=reject` - 拒绝邮件

**完整配置示例**:
```
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

## 🔍 验证 DNS 记录

### 使用命令行工具

#### 检查 SPF 记录
```bash
nslookup -type=txt yourdomain.com
```

#### 检查 DKIM 记录
```bash
nslookup -type=txt resend._domainkey.yourdomain.com
```

#### 检查 DMARC 记录
```bash
nslookup -type=txt _dmarc.yourdomain.com
```

### 使用在线工具

1. **MXToolbox** - https://mxtoolbox.com/
   - 输入域名
   - 选择 "TXT Lookup"
   - 查看所有 TXT 记录

2. **DNS Checker** - https://dnschecker.org/
   - 输入域名
   - 选择 "TXT"
   - 查看全球 DNS 传播状态

3. **Google Admin Toolbox** - https://toolbox.googleapps.com/apps/dig/
   - 输入域名和记录类型
   - 查看详细的 DNS 信息

## 🚨 常见问题

### Q1: DNS 记录配置后多久生效？

**A**: 
- 通常 5-30 分钟
- 最长可能需要 24-48 小时
- 取决于 DNS 服务商和 TTL 设置

### Q2: 验证失败怎么办？

**A**: 检查以下几点：
1. DNS 记录是否完全匹配（包括空格）
2. 记录类型是否正确（TXT）
3. 主机记录名称是否正确
4. 等待足够的时间（至少30分钟）
5. 清除本地 DNS 缓存

### Q3: 可以使用子域名吗？

**A**: 可以！

例如使用 `mail.yourdomain.com`:
1. 在 Resend 添加 `mail.yourdomain.com`
2. 配置相应的 DNS 记录
3. 使用 `noreply@mail.yourdomain.com` 作为发件人

### Q4: 需要配置 MX 记录吗？

**A**: 不需要！

- MX 记录用于接收邮件
- Resend 只负责发送邮件
- 只需配置 SPF、DKIM、DMARC

### Q5: 可以使用免费域名吗？

**A**: 可以，但不推荐

- 免费域名可能被邮件服务商标记为垃圾邮件
- 推荐使用付费的顶级域名（.com, .net, .org 等）

### Q6: 一个域名可以用于多个应用吗？

**A**: 可以！

使用不同的邮箱名称：
- `app1@yourdomain.com`
- `app2@yourdomain.com`
- `noreply@yourdomain.com`

### Q7: 如何提高邮件送达率？

**A**: 
1. ✅ 正确配置 SPF、DKIM、DMARC
2. ✅ 使用已验证的域名
3. ✅ 避免垃圾邮件关键词
4. ✅ 提供退订链接
5. ✅ 保持良好的发送记录
6. ✅ 使用专业的邮件模板

## 📝 配置检查清单

完成以下检查确保配置正确：

- [ ] 域名已添加到 Resend
- [ ] SPF 记录已配置
- [ ] DKIM 记录已配置
- [ ] DMARC 记录已配置（可选但推荐）
- [ ] DNS 记录已生效（使用在线工具验证）
- [ ] Resend 显示域名状态为 "Verified"
- [ ] 已更新 `.env.local` 中的 `RESEND_FROM_EMAIL`
- [ ] 测试发送成功

## 🎯 最佳实践

1. **使用专用子域名**
   ```
   mail.yourdomain.com
   email.yourdomain.com
   ```

2. **设置合理的 DMARC 策略**
   ```
   初期: p=none（监控模式）
   稳定后: p=quarantine 或 p=reject
   ```

3. **配置 DMARC 报告**
   ```
   v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com
   ```

4. **定期检查邮件送达率**
   - 在 Resend 控制台查看统计数据
   - 监控退信率和投诉率

5. **保持域名信誉**
   - 不发送垃圾邮件
   - 及时处理退订请求
   - 保持合理的发送频率

## 🔗 相关资源

- [Resend 域名文档](https://resend.com/docs/dashboard/domains/introduction)
- [SPF 记录生成器](https://www.spfwizard.net/)
- [DMARC 记录生成器](https://dmarcian.com/dmarc-record-wizard/)
- [邮件测试工具](https://www.mail-tester.com/)

## 💡 示例配置

### 完整的 DNS 配置示例

假设域名为 `example.com`：

```
类型  主机记录              记录值                                    TTL
TXT   @                     v=spf1 include:_spf.resend.com ~all      3600
TXT   resend._domainkey     k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA...    3600
TXT   _dmarc                v=DMARC1; p=none; rua=mailto:dmarc@...   3600
```

### 应用配置示例

```env
# .env.local
RESEND_API_KEY=re_your_actual_api_key
RESEND_FROM_EMAIL=Stravision <noreply@example.com>
```

---

配置完成后，你就可以向任何邮箱发送验证邮件了！🎉
