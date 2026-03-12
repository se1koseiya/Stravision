# 腾讯地图天气API接入完成 ✅

## 测试结果

腾讯地图天气API已成功接入并测试通过！

```
✅ 成功获取天气数据!
- 地点: 浙江省 宁波市 鄞州区
- 温度: 9°C
- 天气: 多云
- 湿度: 66%
- 风向: 北风
- 风力: 3级
- 气压: 1023hPa
- 更新时间: 2026-03-03 13:40
```

## 快速测试

### 1. 测试腾讯地图API（命令行）

```bash
node test-tencent-weather.js
```

### 2. 测试Web界面

启动开发服务器后访问：
```
http://localhost:3000/test-weather
```

### 3. 在浏览器控制台查看日志

打开浏览器开发者工具，查看Console标签，你会看到：
- `[WeatherContext] GPS location obtained: 纬度 经度`
- `[Weather API] Trying Tencent Map API for 纬度 经度`
- `[Tencent Weather] Request URL: ...`
- `[Weather API] Tencent Map API success for 城市名`

## 配置说明

你的 `.env` 文件中已配置：
```env
TENCENT_MAP_KEY=ASPBZ-PL7L5-GVBIL-IYCVP-OH3AH-HOFCK
TENCENT_MAP_SK=OwR2eEPQx7ZW6eg0mV8PGlp6jnDvL1K4
```

## API优先级

系统会按以下顺序尝试获取天气：

1. **腾讯地图天气API** ✅ (需要经纬度)
   - 提供实时天气数据
   - 最准确的定位
   - 不包含预报数据

2. **xxapi.cn** (需要城市名)
   - 提供实时+7天预报
   - 备用方案

3. **tianqiapi.com** (需要城市名)
   - 提供实时+7天预报
   - 第二备用方案

4. **Mock数据** (所有API失败时)
   - 模拟数据

## 重要说明

### 腾讯地图API特点

- ✅ 实时天气数据准确
- ✅ 支持精确的经纬度定位
- ✅ 包含省市区详细信息
- ❌ 不提供天气预报数据

### 如何获取完整数据

由于腾讯地图实时天气API不提供预报，系统会：
1. 使用腾讯地图API获取实时天气（最准确）
2. 如果需要预报数据，会自动降级到 xxapi 或 tianqiapi

### 浏览器定位权限

首次访问时，浏览器会请求位置权限：
- ✅ 允许 → 使用腾讯地图API（最准确）
- ❌ 拒绝 → 降级到其他API（使用城市名）

## 文件说明

- `lib/services/tencent-weather-service.ts` - 腾讯地图天气服务
- `app/api/weather/route.ts` - 天气API路由（已更新）
- `app/test-weather/page.tsx` - Web测试页面
- `test-tencent-weather.js` - 命令行测试脚本
- `docs/tencent-weather-integration.md` - 完整文档

## 下一步

1. 启动开发服务器：`npm run dev`
2. 访问测试页面：`http://localhost:3000/test-weather`
3. 允许浏览器获取位置权限
4. 查看天气数据和数据来源

## 故障排查

### 问题：显示 tianqiapi 而不是 tencent

**可能原因：**
1. 浏览器拒绝了位置权限
2. 缓存了旧的天气数据
3. 开发服务器需要重启

**解决方法：**
1. 清除浏览器缓存并刷新
2. 重新允许位置权限
3. 重启开发服务器
4. 查看浏览器控制台日志

### 问题：API返回错误

**检查：**
1. 环境变量是否正确配置
2. API Key是否有效
3. 网络连接是否正常

## 技术细节

### API端点
```
https://apis.map.qq.com/ws/weather/v1/
```

### 请求参数
- `location`: 纬度,经度（例如：29.8114472174,121.5631929886）
- `key`: 腾讯地图API Key
- `sig`: 签名（可选，使用SK生成）

### 签名算法
```
MD5(请求路径?参数字符串+SK)
```

## 更新日志

### 2026-03-03
- ✅ 修复API路径错误（`/ws/weather/v1/weather` → `/ws/weather/v1/`）
- ✅ 更新响应数据结构处理
- ✅ 添加详细日志输出
- ✅ 创建测试脚本
- ✅ 测试通过并成功获取天气数据
