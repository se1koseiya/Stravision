# 如何验证腾讯地图天气API正在使用

## 方法1：查看浏览器控制台（推荐）

1. 打开你的应用（例如：`http://localhost:3000`）
2. 按 `F12` 打开开发者工具
3. 切换到 `Console` 标签
4. 刷新页面
5. 查找以下日志：

```
[WeatherContext] Requesting GPS location...
[WeatherContext] GPS location obtained: 29.8114... 121.5631...
[WeatherContext] Using GPS location: 29.8114... 121.5631...
```

然后在服务器日志中（终端）查找：

```
[Weather API] Request params: { city: '宁波', lat: '29.8114...', lon: '121.5631...' }
[Weather API] Tencent config: { hasKey: true, hasSk: true, keyPrefix: 'ASPBZ-PL7L' }
[Weather API] Trying Tencent Map API for 29.8114... 121.5631...
[Tencent Weather] Request URL: https://apis.map.qq.com/ws/weather/v1/...
[Tencent Weather] Response status: 200
[Tencent Weather] Response data: {"status":0,"message":"Success"...
[Weather API] Tencent Map API success for 宁波市
```

最后在浏览器控制台看到：

```
[WeatherContext] Weather data fetched for: 宁波市 (source: tencent)
```

## 方法2：查看页面显示的数据来源

在你的应用界面上，天气数据应该显示：
- 数据来源：`tencent`
- 或者在测试页面上看到绿色的 "数据来源: tencent"

## 方法3：使用测试页面

访问专门的测试页面：
```
http://localhost:3000/test-weather
```

这个页面会：
1. 自动获取你的位置
2. 显示经纬度
3. 调用天气API
4. 显示数据来源（应该是 "tencent"）
5. 显示完整的天气数据

## 方法4：运行命令行测试

在项目根目录运行：
```bash
node test-tencent-weather.js
```

你应该看到：
```
✅ 成功获取天气数据!
- 地点: 浙江省 宁波市 鄞州区
- 温度: 9°C
- 天气: 多云
...
```

## 如果看到的是 tianqiapi 而不是 tencent

### 原因1：没有经纬度数据

腾讯地图API需要经纬度才能工作。检查：
- 浏览器是否允许了位置权限
- 控制台是否显示 "GPS location obtained"

### 原因2：缓存问题

解决方法：
1. 清除浏览器缓存
2. 硬刷新（Ctrl+Shift+R 或 Cmd+Shift+R）
3. 重启开发服务器

### 原因3：API调用失败

查看服务器日志（终端）是否有错误：
```
[Weather API] Tencent Map API failed: ...
```

如果有错误，检查：
- 环境变量是否正确配置
- API Key是否有效
- 网络连接是否正常

## 完整的日志流程

### 成功使用腾讯地图API的完整日志：

**浏览器控制台：**
```
[WeatherContext] Requesting GPS location...
[WeatherContext] GPS location obtained: 29.8114472174 121.5631929886
[WeatherContext] Using GPS location: 29.8114472174 121.5631929886
[WeatherContext] Weather data fetched for: 宁波市 (source: tencent)
```

**服务器终端：**
```
[Weather API] Request params: { city: '宁波', lat: '29.8114472174', lon: '121.5631929886' }
[Weather API] Tencent config: { hasKey: true, hasSk: true, keyPrefix: 'ASPBZ-PL7L' }
[Weather API] Trying Tencent Map API for 29.8114472174 121.5631929886
[Tencent Weather] Request URL: https://apis.map.qq.com/ws/weather/v1/?location=...
[Tencent Weather] Response status: 200
[Tencent Weather] Response data: {"status":0,"message":"Success","request_id":"...
[Weather API] Tencent Map API success for 宁波市
```

## 快速检查清单

- [ ] 环境变量 `TENCENT_MAP_KEY` 已配置
- [ ] 环境变量 `TENCENT_MAP_SK` 已配置（可选）
- [ ] 浏览器允许了位置权限
- [ ] 开发服务器已重启
- [ ] 浏览器缓存已清除
- [ ] 控制台显示 "GPS location obtained"
- [ ] 服务器日志显示 "Trying Tencent Map API"
- [ ] 服务器日志显示 "Tencent Map API success"
- [ ] 页面显示数据来源为 "tencent"

如果所有步骤都完成但仍然不工作，请查看服务器日志中的错误信息。
