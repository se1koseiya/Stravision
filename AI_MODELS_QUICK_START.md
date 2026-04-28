# AI 模型管理 - 快速开始

## 🎯 快速访问

1. 访问 `/admin` 管理后台
2. 点击 **"AI Models"** 标签页
3. 开始管理模型列表

---

## ⚡ 常用操作

### 添加新模型
```
1. 点击 "添加模型" 按钮
2. 填写模型 ID 和名称
3. 选择分类和图标
4. 点击 "保存"
5. 点击 "保存配置"
```

### 启用/禁用模型
```
1. 找到目标模型
2. 切换右侧开关
3. 点击 "保存配置"
```

### 调整顺序
```
1. 点击模型左侧的上下箭头
2. 点击 "保存配置"
```

---

## 📋 模型配置示例

### 添加 GPT-4 模型

```json
{
  "id": "gpt-4",
  "name": "GPT-4",
  "description": "OpenAI 最强大的模型",
  "category": "other",
  "icon": "sparkles",
  "enabled": true
}
```

### 添加 Claude 模型

```json
{
  "id": "claude-3-opus",
  "name": "Claude 3 Opus",
  "description": "Anthropic 最强推理模型",
  "category": "reasoning",
  "icon": "sparkles",
  "enabled": true
}
```

---

## 🎨 可用图标

- `qwen` - 通义千问
- `deepseek` - DeepSeek
- `moonshot` - Kimi
- `zhipu` - 智谱 GLM
- `minimax` - Minimax
- `sparkles` - 通用图标

---

## 📂 可用分类

- `featured` - 精选国产模型
- `reasoning` - 深度思考/推理
- `qwen` - Alibaba Qwen 系列
- `other` - 其他国产模型

---

## ⚠️ 重要提示

1. ✅ 修改后必须点击 **"保存配置"** 才能生效
2. ✅ 模型 ID 创建后不可修改
3. ✅ 禁用的模型不会在 AI 助手中显示
4. ✅ 修改后需要刷新 AI 助手页面

---

## 🔍 查看效果

修改保存后：
1. 打开 `/ai-assistant` 页面
2. 点击模型选择器
3. 查看更新后的模型列表

---

完整文档请查看 `AI_MODELS_MANAGEMENT_GUIDE.md`
