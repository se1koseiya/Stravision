# AI 模型管理功能使用指南

## 📋 功能概述

管理员可以通过 `/admin` 后台的 "AI Models" 标签页管理 AI 助手页面显示的模型列表。

## 🎯 功能特性

### 1. 模型管理
- ✅ 添加新模型
- ✅ 编辑现有模型
- ✅ 删除模型
- ✅ 启用/禁用模型
- ✅ 调整模型显示顺序
- ✅ 按分类组织模型

### 2. 模型配置项
每个模型包含以下配置：
- **模型 ID**: 唯一标识符（如 `qwen-max`）
- **显示名称**: 在 UI 中显示的名称（如 `Qwen Max`）
- **描述**: 模型的简短描述
- **分类**: 模型所属的分类
- **图标**: 模型的图标类型
- **启用状态**: 是否在 AI 助手中显示

### 3. 分类管理
预设分类：
- **精选国产模型** (featured)
- **深度思考 / 推理** (reasoning)
- **Alibaba Qwen 系列** (qwen)
- **其他国产模型** (other)

---

## 🚀 使用方法

### 访问管理界面

1. 登录管理员账号
2. 访问 `/admin` 页面
3. 点击 "AI Models" 标签页

### 添加新模型

1. 点击右上角的 "添加模型" 按钮
2. 填写模型信息：
   - **模型 ID**: 必填，唯一标识符（如 `gpt-4`）
   - **显示名称**: 必填，用户看到的名称（如 `GPT-4`）
   - **描述**: 可选，模型的简短介绍
   - **分类**: 选择模型所属分类
   - **图标**: 选择图标类型
   - **启用状态**: 勾选以在 AI 助手中显示
3. 点击 "保存" 按钮
4. 点击页面右上角的 "保存配置" 按钮使更改生效

### 编辑模型

1. 找到要编辑的模型
2. 点击模型右侧的 ✏️ 编辑按钮
3. 修改模型信息
4. 点击 "保存" 按钮
5. 点击页面右上角的 "保存配置" 按钮

### 启用/禁用模型

1. 找到要启用/禁用的模型
2. 切换模型右侧的开关
3. 点击页面右上角的 "保存配置" 按钮

### 调整模型顺序

1. 找到要调整的模型
2. 点击模型左侧的上下箭头按钮
3. 点击页面右上角的 "保存配置" 按钮

### 删除模型

1. 找到要删除的模型
2. 点击模型右侧的 🗑️ 删除按钮
3. 确认删除
4. 点击页面右上角的 "保存配置" 按钮

---

## 📁 技术实现

### 文件结构

```
data/
  ai-models-config.json          # 模型配置文件

app/api/admin/ai-models/
  route.ts                       # API 路由（GET/POST）

components/admin/
  ai-models-manager.tsx          # 管理界面组件

lib/hooks/
  use-ai-models.ts               # 模型数据 Hook

app/admin/
  page.tsx                       # 管理后台页面
```

### 配置文件格式

`data/ai-models-config.json`:

```json
{
  "models": [
    {
      "id": "qwen-max",
      "name": "Qwen Max",
      "description": "通义千问最强生产力工具",
      "category": "reasoning",
      "icon": "qwen",
      "enabled": true,
      "order": 0
    }
  ],
  "categories": [
    {
      "id": "featured",
      "name": "精选国产模型",
      "order": 0
    }
  ]
}
```

### API 端点

#### GET `/api/admin/ai-models`
获取当前模型配置

**响应**:
```json
{
  "models": [...],
  "categories": [...]
}
```

#### POST `/api/admin/ai-models`
更新模型配置

**请求体**:
```json
{
  "models": [...],
  "categories": [...]
}
```

**响应**:
```json
{
  "success": true,
  "message": "Models config updated successfully"
}
```

---

## 🎨 图标类型

可用的图标类型：
- `qwen` - Qwen (通义千问)
- `deepseek` - DeepSeek
- `moonshot` - Moonshot (Kimi)
- `zhipu` - Zhipu (GLM)
- `minimax` - Minimax
- `sparkles` - Sparkles (用于"智能模型"等特殊选项)

---

## 🔧 在 AI 助手中使用

### 方法 1: 使用 Hook（推荐）

```typescript
import { useAIModels } from '@/lib/hooks/use-ai-models'

function MyComponent() {
  const { 
    config, 
    loading, 
    error,
    getEnabledModels,
    getModelsByCategory,
    getCategories 
  } = useAIModels()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  const enabledModels = getEnabledModels()
  const categories = getCategories()

  return (
    <div>
      {categories.map(category => (
        <div key={category.id}>
          <h3>{category.name}</h3>
          {getModelsByCategory(category.id).map(model => (
            <div key={model.id}>{model.name}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

### 方法 2: 直接调用 API

```typescript
const res = await fetch('/api/admin/ai-models')
const config = await res.json()
```

---

## 📝 注意事项

1. **保存配置**: 修改后必须点击 "保存配置" 按钮才能生效
2. **模型 ID**: 模型 ID 一旦创建不可修改，请谨慎设置
3. **启用状态**: 禁用的模型不会在 AI 助手中显示
4. **顺序**: 模型在 AI 助手中的显示顺序由 `order` 字段决定
5. **分类**: 模型会按分类分组显示

---

## 🐛 故障排除

### 问题 1: 修改后没有生效

**解决方案**:
1. 确认已点击 "保存配置" 按钮
2. 刷新 AI 助手页面
3. 检查浏览器控制台是否有错误

### 问题 2: 无法加载模型列表

**解决方案**:
1. 检查 `data/ai-models-config.json` 文件是否存在
2. 检查文件格式是否正确（有效的 JSON）
3. 检查文件权限

### 问题 3: 添加的模型没有显示

**解决方案**:
1. 确认模型的 `enabled` 字段为 `true`
2. 确认模型的分类存在
3. 刷新 AI 助手页面

---

## 🔄 更新日志

### v1.0.0 (2026-04-23)
- ✅ 初始版本
- ✅ 支持添加、编辑、删除模型
- ✅ 支持启用/禁用模型
- ✅ 支持调整模型顺序
- ✅ 支持按分类组织模型

---

## 📞 技术支持

如有问题，请联系系统管理员或查看项目文档。
