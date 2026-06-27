# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Feature: AI 助手自动选择模型 admin 可配置

**需求** AI 助手中每次刷新后自动选择的模型应该是动态选择器列表里的模型，且 admin 后台可设置自动选择的模型。

---

### Changed / Added

#### 1. 后端 - 模型/提供商配置

- [`lib/ai/provider-resolver.ts`](./lib/ai/provider-resolver.ts)
  - 新增 `ProvidersConfig` 接口（包含 `defaultModelId` 字段）
  - `readProvidersConfig()` 返回类型升级为 `ProvidersConfig`
  - 新增 `resolveDefaultModelId(config)` 工具函数
    - 规则：admin 配置 > 默认 provider 的第一个 enabled 模型 > 第一个 enabled 模型
  - `getPublicProviders()` 返回值新增 `defaultModelId` 字段（自动回退到第一个 enabled 模型）

- [`app/api/ai/providers/route.ts`](./app/api/ai/providers/route.ts)
  - 公开接口透传 `defaultModelId` 给前端

- [`app/api/admin/ai-providers/route.ts`](./app/api/admin/ai-providers/route.ts)
  - `ProvidersConfig` 类型新增 `defaultModelId?: string`
  - 默认配置预置 `defaultModelId: 'qwen3.6-plus'`
  - `GET` 响应同时返回 `defaultModelId`

- [`app/api/admin/ai-providers/default-model/route.ts`](./app/api/admin/ai-providers/default-model/route.ts) **(新文件)**
  - `GET`：返回 `{ configuredDefaultModelId, effectiveDefaultModelId }`
  - `PUT`：接受 `{ modelId: string | null }`，校验必须是已启用的 provider/model 下的 enabled 模型；保存后返回生效的 defaultModelId
  - 鉴权：仅 admin / super_admin

#### 2. 前端 hook

- [`lib/hooks/use-ai-models.ts`](./lib/hooks/use-ai-models.ts)
  - `ModelsConfig` 接口新增 `defaultModelId?: string | null`
  - `fetchModels()` 从 `/api/ai/providers` 响应中读取 `defaultModelId` 写入 config
  - 新增 `getDefaultModelId()` 工具函数（前端侧 fallback 逻辑，规则与后端一致）

#### 3. AI 助手页面 (PC + iOS)

- [`app/ai-assistant/page.tsx`](./app/ai-assistant/page.tsx)
  - 从 `useAIModels()` 解构出 `getDefaultModelId`
  - 新增 `useEffect` 自动回退：
    - 等待 `aiConfig` 加载完成
    - 计算当前 `selectedModel || aiSettings?.model || ""`
    - 若当前值为空或不在 enabled 模型列表中 → 使用 `getDefaultModelId()` 兜底
    - 同步回写 `ai-settings` localStorage，避免被其它 effect 重置

- [`app/(mobile)/ai-assistant-ios/page.tsx`](./app/(mobile)/ai-assistant-ios/page.tsx)
  - 引入 `useAIModels` hook
  - 新增与 PC 端完全一致的自动回退 `useEffect`
  - PC/iOS 体验对齐

#### 4. Admin 后台 UI

- [`components/admin/ai-providers-manager.tsx`](./components/admin/ai-providers-manager.tsx)
  - 新增状态：`defaultModelId`、`defaultModelDraft`、`savingDefault`
  - `fetchProviders()` 解析接口返回的 `defaultModelId`
  - 新增 `handleSaveDefaultModel()` 调用 `PUT /api/admin/ai-providers/default-model`
  - 在"AI 提供商管理"页头部下方新增"自动选择模型"卡片：
    - 蓝色 Sparkles 图标 + 标题 + "刷新后生效" 角标
    - 描述文字：当前生效模型（provider · model）
    - 模型下拉框（来源：所有 enabled provider 的 enabled model，按 provider priority 排序）
    - 保存按钮（未变更时禁用，含 loading 态）
    - 配置的 defaultModelId 失效时显示 amber 提示

---

### Behavior

1. **首次打开 / 刷新 AI 助手页面**
   - 若 localStorage 中 `ai-settings.model` 为空 → 使用 admin 配置的 defaultModelId
   - 若 `ai-settings.model` 不在已启用模型列表中（admin 已禁用/删除）→ 自动回退到 defaultModelId
   - 同步回写 localStorage（一次性）

2. **用户手动选择模型**
   - 不再被回退逻辑覆盖（effect 依赖仅为 `[aiConfig, aiConfigLoading]`，模型列表变更才重新评估）

3. **Admin 修改 defaultModelId**
   - 通过 "AI 提供商管理" → "自动选择模型" 卡片的下拉框 → 保存
   - 下次刷新 AI 助手即生效

4. **API 校验**
   - 写入 defaultModelId 时必须存在某个 enabled provider 下的 enabled model
   - 写入空字符串 / `null` 等价于"清除配置"，回退到第一个 enabled 模型

---

### Compatibility

- `data/ai-providers-config.json` 老配置无 `defaultModelId` 字段：自动回退到第一个 enabled provider 的第一个 enabled 模型
- `/api/ai/providers` 老调用方只读 `providers` 字段的行为不变；`defaultModelId` 是新增字段
- `useAIModels` 老调用方只读 `config.models/categories/providers` 行为不变；`defaultModelId` 与 `getDefaultModelId()` 是新增

---

### Files

| File | Type | Lines |
| --- | --- | --- |
| `lib/ai/provider-resolver.ts` | modified | +30 |
| `app/api/ai/providers/route.ts` | modified | +5 / -3 |
| `app/api/admin/ai-providers/route.ts` | modified | +10 |
| `app/api/admin/ai-providers/default-model/route.ts` | new | +93 |
| `lib/hooks/use-ai-models.ts` | modified | +20 |
| `app/ai-assistant/page.tsx` | modified | +35 |
| `app/(mobile)/ai-assistant-ios/page.tsx` | modified | +45 |
| `components/admin/ai-providers-manager.tsx` | modified | +120 |

---

### Future

- 提供"用户级别"覆盖：admin 配置全局默认，用户可在自己的 settings 中选择并持久化
- 提供 defaultModelId 变更广播事件（页面收到 event 后立即重选模型）
