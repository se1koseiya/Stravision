# MQTT API 参数映射

## 问题

AI Device Control API 和 MQTT Control API 使用不同的参数名称，导致命令执行失败。

## 参数映射

### 继电器控制 (Relay)

#### AI 命令格式
```json
{
  "action": "toggle_relay",
  "device": 5,
  "value": 1
}
```

#### MQTT API 格式
```json
{
  "type": "relay",
  "relayNum": 5,
  "newState": 1
}
```

**映射关系**:
- `action: "toggle_relay"` → `type: "relay"`
- `device` → `relayNum`
- `value` → `newState` ⚠️ **关键修复**

### LED 控制

#### AI 命令格式
```json
{
  "action": "set_led",
  "r": 255,
  "g": 100,
  "b": 50
}
```

#### MQTT API 格式
```json
{
  "type": "led",
  "led1": 255,
  "led2": 100,
  "led3": 50,
  "led4": 0
}
```

**映射关系**:
- `action: "set_led"` → `type: "led"`
- `r` → `led1` (红色)
- `g` → `led2` (绿色)
- `b` → `led3` (蓝色)
- `w` → `led4` (白色，默认 0)

## 修复代码

### 继电器控制

```typescript
// 修复前 ❌
const mqttPayload = {
  type: 'relay',
  relayNum: device,
  value: value  // 错误：MQTT API 不认识 value
}

// 修复后 ✅
const mqttPayload = {
  type: 'relay',
  relayNum: device,
  newState: value  // 正确：使用 newState
}
```

### LED 控制

```typescript
// 修复前 ❌
const mqttPayload = {
  type: 'led',
  r, g, b, w: 0  // 错误：MQTT API 不认识 r, g, b, w
}

// 修复后 ✅
const mqttPayload = {
  type: 'led',
  led1: r,  // 红色
  led2: g,  // 绿色
  led3: b,  // 蓝色
  led4: 0   // 白色
}
```

## MQTT API 验证规则

### 继电器命令验证

```typescript
// 必需字段
- type: 'relay'
- relayNum: 5-8
- newState: 0 或 1

// 验证逻辑
if (data.relayNum === undefined) {
  return 'Missing relayNum field for relay command'
}
if (data.newState === undefined) {
  return 'Missing newState field for relay command'
}
if (data.relayNum < 5 || data.relayNum > 8) {
  return 'relayNum must be between 5 and 8'
}
if (data.newState !== 0 && data.newState !== 1) {
  return 'newState must be 0 or 1'
}
```

### LED 命令验证

```typescript
// 必需字段
- type: 'led'
- 至少一个 LED 值 (led1, led2, led3, led4)

// 可选字段
- led1: 0-255 (红色)
- led2: 0-255 (绿色)
- led3: 0-255 (蓝色)
- led4: 0-255 (白色)

// 验证逻辑
if (data.led1 === undefined && data.led2 === undefined && 
    data.led3 === undefined && data.led4 === undefined) {
  return 'At least one LED value must be provided'
}
if (value < 0 || value > 255) {
  return 'LED value must be between 0 and 255'
}
```

## 完整的 API 流程

### 继电器控制流程

```
用户请求
    ↓
AI 生成命令
{
  "action": "toggle_relay",
  "device": 5,
  "value": 1
}
    ↓
AI Device Control API 转换
{
  "type": "relay",
  "relayNum": 5,
  "newState": 1
}
    ↓
MQTT Control API 验证
    ↓
MQTT Service 发送命令
    ↓
设备执行
```

### LED 控制流程

```
用户请求
    ↓
AI 生成命令
{
  "action": "set_led",
  "r": 255,
  "g": 100,
  "b": 50
}
    ↓
AI Device Control API 转换
{
  "type": "led",
  "led1": 255,
  "led2": 100,
  "led3": 50,
  "led4": 0
}
    ↓
MQTT Control API 验证
    ↓
MQTT Service 发送命令
    ↓
设备执行
```

## 错误信息对照

### 修复前的错误

```json
{
  "success": false,
  "message": "Missing newState field for relay command",
  "timestamp": 1763716206594
}
```

**原因**: 使用了 `value` 而不是 `newState`

### 修复后的成功响应

```json
{
  "success": true,
  "message": "Control command sent successfully",
  "timestamp": 1763716206594
}
```

## 测试用例

### 测试 1: 开启水泵

**AI 命令**:
```json
{
  "action": "toggle_relay",
  "device": 5,
  "value": 1
}
```

**转换后的 MQTT 命令**:
```json
{
  "type": "relay",
  "relayNum": 5,
  "newState": 1
}
```

**预期结果**: ✅ 水泵开启

### 测试 2: 设置 RGB 颜色

**AI 命令**:
```json
{
  "action": "set_led",
  "r": 200,
  "g": 50,
  "b": 150
}
```

**转换后的 MQTT 命令**:
```json
{
  "type": "led",
  "led1": 200,
  "led2": 50,
  "led3": 150,
  "led4": 0
}
```

**预期结果**: ✅ LED 颜色更新为紫红色

## 注意事项

1. **参数名称必须精确匹配**: MQTT API 严格验证参数名称
2. **类型转换**: 确保数值类型正确（number 而不是 string）
3. **范围验证**: 
   - relayNum: 5-8
   - newState: 0 或 1
   - LED 值: 0-255
4. **必需字段**: 不能省略任何必需字段

## 相关文件

- `/app/api/ai/device-control/route.ts` - AI 命令转换
- `/app/api/mqtt/control/route.ts` - MQTT API 接口
- `/lib/mqtt-service.ts` - MQTT 服务实现

## 调试技巧

### 查看转换后的命令

```typescript
console.log('[AI Device Control] Calling MQTT API with:', mqttPayload)
```

### 查看 MQTT API 响应

```typescript
console.log('[AI Device Control] MQTT API result:', result)
```

### 常见错误排查

1. **"Missing newState field"** → 使用了 `value` 而不是 `newState`
2. **"Missing relayNum field"** → 使用了 `device` 而不是 `relayNum`
3. **"At least one LED value must be provided"** → 没有提供任何 LED 值
4. **"LED value must be between 0 and 255"** → LED 值超出范围
