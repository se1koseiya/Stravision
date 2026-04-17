# RGB补光灯BRG协议修复

## 问题描述
孪生系统的补光灯调节，调节出来的颜色与实际的补光灯颜色不符。

## 根本原因
硬件使用的协议与标准RGB顺序不同（BRG顺序）：
- 硬件 node0501 对应 **Blue (蓝色)**
- 硬件 node0502 对应 **Red (红色)**
- 硬件 node0503 对应 **Green (绿色)**

之前的代码使用了错误的顺序映射。

## 修复方案

### 方案：前端直接使用硬件BRG顺序

前端和接口层统一调整为硬件的BRG顺序，减少转换层次：

**接口参数定义（已调整）：**
- `led1` = Blue (蓝色)
- `led2` = Red (红色)
- `led3` = Green (绿色)

**前端调用时的转换：**
- 前端UI仍然使用 r, g, b 变量（用户友好）
- 调用setLEDs时转换为BRG顺序：`setLEDs(b, r, g, 0)`

**AI接口的转换：**
- AI发送标准RGB语义：`{r: 255, g: 0, b: 0}`
- API层转换为BRG顺序：`led1=b, led2=r, led3=g`

## 修改的文件

1. **lib/mqtt-service.ts** - MQTT服务层，直接映射led1=Blue, led2=Red, led3=Green
2. **lib/hooks/use-device-control.ts** - 更新注释说明接口参数为BRG顺序
3. **app/device-control/device-control-client.tsx** - 前端调用时转换RGB到BRG
4. **components/monitor/greenhouse-model.tsx** - 前端调用时转换RGB到BRG，同步时转换BRG到RGB
5. **app/api/ai/device-control/route.ts** - AI接口转换RGB到BRG

## 影响范围

### 已修改的部分
- ✅ MQTT服务层 (lib/mqtt-service.ts) - 直接映射BRG
- ✅ 前端设备控制页面 (device-control-client.tsx) - 调用时转换
- ✅ 前端孪生系统 (greenhouse-model.tsx) - 调用和同步时转换
- ✅ AI设备控制API (app/api/ai/device-control/route.ts) - 转换RGB到BRG
- ✅ 设备控制Hook (use-device-control.ts) - 更新注释

### 不需要修改的部分
- ✅ MQTT控制API (app/api/mqtt/control/route.ts) - 直接传递参数
- ✅ 其他调用 setLEDs 的代码 - 只要按BRG顺序传参即可

## 测试验证

### 测试用例
1. **纯红色测试**
   - 前端设置: r=255, g=0, b=0
   - 调用setLEDs: (0, 255, 0, 0) → led1=0(Blue), led2=255(Red), led3=0(Green)
   - 硬件接收: node0501=0(Blue), node0502=255(Red), node0503=0(Green)
   - 预期结果: 显示红色 ✅

2. **纯绿色测试**
   - 前端设置: r=0, g=255, b=0
   - 调用setLEDs: (0, 0, 255, 0) → led1=0(Blue), led2=0(Red), led3=255(Green)
   - 硬件接收: node0501=0(Blue), node0502=0(Red), node0503=255(Green)
   - 预期结果: 显示绿色 ✅

3. **纯蓝色测试**
   - 前端设置: r=0, g=0, b=255
   - 调用setLEDs: (255, 0, 0, 0) → led1=255(Blue), led2=0(Red), led3=0(Green)
   - 硬件接收: node0501=255(Blue), node0502=0(Red), node0503=0(Green)
   - 预期结果: 显示蓝色 ✅

4. **白色测试**
   - 前端设置: r=255, g=255, b=255
   - 调用setLEDs: (255, 255, 255, 0) → led1=255(Blue), led2=255(Red), led3=255(Green)
   - 硬件接收: node0501=255(Blue), node0502=255(Red), node0503=255(Green)
   - 预期结果: 显示白色 ✅

5. **黄色测试 (R+G)**
   - 前端设置: r=255, g=255, b=0
   - 调用setLEDs: (0, 255, 255, 0) → led1=0(Blue), led2=255(Red), led3=255(Green)
   - 硬件接收: node0501=0(Blue), node0502=255(Red), node0503=255(Green)
   - 预期结果: 显示黄色 ✅

## 部署说明

1. 修改已完成，无需重启服务
2. 下次调节补光灯时，颜色将与实际硬件一致
3. 所有页面的RGB补光灯调节都已修复：
   - /monitor 页面 (孪生系统)
   - /device-control 页面
   - AI助手控制
   - 语音控制

## 技术细节

### 协议转换层
```
用户界面层 (RGB语义: r, g, b)
    ↓
前端转换层 (调用时: setLEDs(b, r, g, 0))
    ↓
应用逻辑层 (BRG顺序: led1=Blue, led2=Red, led3=Green)
    ↓
MQTT服务层 (直接映射)
    ↓
硬件层 (node0501=Blue, node0502=Red, node0503=Green)
```

### 完整映射表
| 用户界面 | 前端变量 | 接口参数 | 硬件节点 | 硬件功能 |
|---------|---------|---------|---------|---------|
| 红色滑块 | r | led2 | node0502 | Red 红色通道 |
| 绿色滑块 | g | led3 | node0503 | Green 绿色通道 |
| 蓝色滑块 | b | led1 | node0501 | Blue 蓝色通道 |

### 调用示例
```typescript
// 前端设置纯红色
const r = 255, g = 0, b = 0
setLEDs(b, r, g, 0)  // 转换为BRG顺序: (0, 255, 0, 0)
// 硬件接收: node0501=0(Blue), node0502=255(Red), node0503=0(Green)
// 结果: 显示红色 ✅
```

这种设计的优点：
1. 接口层直接使用硬件顺序，减少转换复杂度
2. 前端在调用时做一次转换，保持用户友好的RGB语义
3. AI接口在API层做转换，保持标准RGB语义
4. MQTT服务层直接映射，无需额外转换逻辑
5. 所有转换都在明确的边界处进行，易于维护

## 完成时间
2026-04-16
