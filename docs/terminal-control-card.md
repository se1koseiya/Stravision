# 终端风格控制指令卡片设计

## 设计概述

全新的设备控制指令卡片采用终端（Terminal）风格设计，模拟真实的命令行界面，并配有打字机效果，让控制指令的执行过程更加生动和专业。

## 核心特性

### 1. 终端窗口样式
- **macOS 风格工具栏**：
  - 三个交通灯按钮（红、黄、绿）
  - 深色背景 `#2d2d2d`
  - 终端标题显示设备名称

### 2. 打字机效果
- **逐字符显示**：JSON 代码以 20ms/字符的速度打出
- **光标动画**：白色闪烁光标跟随打字进度
- **实时渲染**：使用 React hooks 实现流畅动画

### 3. 命令行提示符
```
root@device-name:~$ execute
```
- **用户名**：绿色 `#00ff9c`
- **设备名**：蓝色 `#0066ff`
- **路径**：紫色 `#ff00ff`
- **命令**：白色

### 4. 配色方案

#### 终端背景
- **主背景**：`#1e1e1e`（深灰黑色）
- **工具栏**：`#2d2d2d`（稍浅的灰色）
- **边框**：`#3a3a3a`

#### 交通灯按钮
- **红色**：`#ff5f56`（关闭）
- **黄色**：`#ffbd2e`（最小化）
- **绿色**：`#27c93f`（最大化）

#### 文字颜色
- **JSON 代码**：`#00ff9c`（亮绿色，经典终端色）
- **用户名**：`#00ff9c`
- **设备名**：`#0066ff`
- **路径**：`#ff00ff`
- **成功提示**：`#27c93f`

## 组件结构

### 终端工具栏
```tsx
<div className="flex items-center justify-between h-9 px-4 bg-[#2d2d2d]">
  {/* 交通灯 */}
  <div className="flex items-center gap-2">
    <button className="w-3 h-3 rounded-full bg-[#ff5f56]" />
    <button className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
    <button className="w-3 h-3 rounded-full bg-[#27c93f]" />
  </div>
  
  {/* 标题 */}
  <div className="flex items-center gap-2">
    <Icon size={14} className="text-emerald-400" />
    <span>device-name@iot-hub</span>
  </div>
  
  {/* 状态 */}
  <div className="text-emerald-400">已执行</div>
</div>
```

### 终端主体
```tsx
<div className="bg-[#1e1e1e] p-4 font-mono">
  {/* 命令提示符 */}
  <div className="flex items-center mb-2">
    <span className="text-[#00ff9c]">root</span>
    <span className="text-white/50">@</span>
    <span className="text-[#0066ff]">device-name</span>
    <span className="text-white/50">:</span>
    <span className="text-[#ff00ff]">~</span>
    <span className="text-white/70">$</span>
    <span className="text-white/90">execute</span>
  </div>
  
  {/* JSON 输出（打字机效果）*/}
  <pre className="text-[#00ff9c]">
    {displayedText}
    {isTyping && <span className="cursor" />}
  </pre>
  
  {/* 执行结果 */}
  <div className="mt-3 pt-3 border-t border-white/10">
    <span className="text-emerald-400">✓</span>
    <span>Command executed successfully</span>
  </div>
</div>
```

## 打字机效果实现

### 核心逻辑
```typescript
useEffect(() => {
  let currentIndex = 0;
  setDisplayedText('');
  setIsTyping(true);

  const typingInterval = setInterval(() => {
    if (currentIndex < jsonStr.length) {
      setDisplayedText(jsonStr.substring(0, currentIndex + 1));
      currentIndex++;
    } else {
      setIsTyping(false);
      clearInterval(typingInterval);
    }
  }, 20); // 20ms per character

  return () => clearInterval(typingInterval);
}, [jsonStr]);
```

### 光标闪烁
```typescript
useEffect(() => {
  const cursorInterval = setInterval(() => {
    setCursorVisible(prev => !prev);
  }, 530); // 530ms blink rate

  return () => clearInterval(cursorInterval);
}, []);
```

## 设备类型映射

### 设备名称
- **水泵**：`water-pump`
- **风扇**：`fan`
- **补光灯**：`grow-light`
- **白灯**：`white-light`
- **RGB灯**：`rgb-light`
- **摄像头**：`camera`
- **系统**：`system`（默认）

### 图标映射
- **水泵**：Droplets 💧
- **风扇**：Fan 🌀
- **补光灯**：Zap ⚡
- **白灯**：Lightbulb 💡
- **RGB灯**：Lightbulb 💡
- **摄像头**：Camera 📷
- **系统**：Terminal 💻

## 动画细节

### 打字速度
- **标准速度**：20ms/字符
- **总时长**：约 2-3 秒（取决于 JSON 长度）

### 光标动画
- **闪烁频率**：530ms
- **样式**：白色实心方块
- **宽度**：2px
- **高度**：16px

### 交互效果
- **交通灯悬停**：亮度提升 10%
- **平滑过渡**：所有动画使用 CSS transitions

## 使用示例

```tsx
import { DeviceControlCard } from '@/components/ai/device-control-card'

// 水泵控制
<DeviceControlCard 
  command={{
    action: "toggle_relay",
    device: 5,
    value: 1
  }}
  status="executed"
/>

// RGB 灯控制
<DeviceControlCard 
  command={{
    action: "set_led",
    r: 200,
    g: 100,
    b: 150
  }}
  status="executed"
/>
```

## 性能优化

### 内存管理
- 使用 `useEffect` cleanup 清理定时器
- 避免内存泄漏

### 渲染优化
- 使用 `substring` 而非字符串拼接
- 最小化重渲染次数

## 无障碍设计

- 保持足够的颜色对比度
- 使用语义化的 HTML 标签
- 支持键盘导航

## 浏览器兼容性

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 设计灵感

终端风格设计灵感来源于：
- 💻 macOS Terminal
- 🖥️ VS Code 集成终端
- 🎨 iTerm2
- 🌈 Hyper Terminal

## 未来改进

- [ ] 支持自定义打字速度
- [ ] 添加命令历史记录
- [ ] 支持多行命令输入
- [ ] 添加语法高亮
- [ ] 支持主题切换
