# ASR语音识别故障排除指南

## 🔧 常见问题解决方案

### 1. 404错误 - API端点无法访问

**症状**: 浏览器控制台显示 `Failed to load resource: the server responded with a status of 404 (Not Found)`

**原因**: Next.js开发服务器没有运行

**解决方案**:
```bash
# 启动开发服务器
npm run dev

# 或者使用yarn
yarn dev
```

**验证**: 访问 http://localhost:3000/api/speech/recognize 应该返回支持的语言列表

### 2. 401错误 - 未授权访问

**症状**: POST请求返回 `{"error":"Unauthorized"}` 或 "请先登录后再使用语音输入功能"

**原因**: 
1. 用户未登录或认证token无效
2. 前端请求没有包含认证cookie（已修复）

**解决方案**:
1. 确保用户已登录系统
2. 检查浏览器cookie中是否有有效的auth token
3. 如果问题持续，尝试重新登录
4. 清除浏览器缓存和cookie后重新登录

**技术说明**: 
- GET `/api/speech/recognize` 不需要认证（获取语言列表）
- POST `/api/speech/recognize` 需要认证（处理音频文件）
- 已修复：前端请求现在包含 `credentials: 'include'` 以正确传递cookie

### 3. 500错误 - API密钥未配置

**症状**: 返回 `{"error":"Qwen ASR API key not configured"}`

**原因**: 环境变量中缺少Qwen API密钥

**解决方案**:
1. 检查 `.env` 文件中是否有以下配置：
   ```env
   DASHSCOPE_API_KEY=sk-your-api-key-here
   # 或者
   QWEN_API_KEY=sk-your-api-key-here
   ```
2. 重启开发服务器使环境变量生效

### 4. 麦克风权限被拒绝

**症状**: 浏览器提示麦克风权限被拒绝

**解决方案**:
1. 点击浏览器地址栏左侧的锁图标
2. 允许麦克风权限
3. 刷新页面
4. 确保使用HTTPS协议（生产环境）

### 5. 录音无声音或识别失败

**可能原因**:
- 麦克风硬件问题
- 音频格式不支持
- 网络连接问题
- API配额不足

**解决方案**:
1. 测试麦克风是否正常工作
2. 尝试不同的浏览器
3. 检查网络连接
4. 查看阿里云百炼控制台余额

### 6. 台州话识别不准确

**优化建议**:
1. 选择正确的方言：`中文方言 → 吴语 → 台州话`
2. 在安静环境下录音
3. 语速适中，发音清晰
4. 避免使用过于生僻的方言词汇
5. 可以尝试`吴语 → 自动检测`模式

## 🛠️ 调试工具

### 使用浏览器调试工具
1. 打开浏览器开发者工具 (F12)
2. 切换到Network标签
3. 尝试使用语音输入功能
4. 查看API请求的状态码和响应

### 使用调试页面
访问项目根目录下的 `debug-asr-client.html` 文件进行详细测试。

### 命令行测试
```bash
# 测试GET请求
curl http://localhost:3000/api/speech/recognize

# 测试服务器状态
node -e "fetch('http://localhost:3000/api/speech/recognize').then(r => r.json()).then(console.log)"
```

## 📋 环境检查清单

- [ ] Next.js开发服务器正在运行 (`npm run dev`)
- [ ] 端口3000可访问
- [ ] 用户已登录系统
- [ ] 环境变量配置正确
- [ ] 浏览器支持MediaRecorder API
- [ ] 麦克风权限已授予
- [ ] 网络连接正常
- [ ] API密钥有效且有余额

## 🔍 日志查看

### 服务器端日志
开发服务器控制台会显示ASR相关的日志：
```
[ASR] Processing audio file: recording.webm, size: 12345 bytes, language: zh-CN, dialect: taizhou
[ASR] Recognition successful: 你好，我想问一下...
```

### 浏览器端日志
打开浏览器控制台查看客户端错误信息。

## 📞 技术支持

如果以上解决方案都无法解决问题，请：

1. 收集错误信息（浏览器控制台截图）
2. 记录复现步骤
3. 检查网络环境和设备信息
4. 联系技术支持团队

---

**最后更新**: 2026年3月10日
**版本**: 1.0.0