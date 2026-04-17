# 技能系统使用指南

## 快速开始

新的技能系统已经完全集成到项目中，无需修改现有代码即可使用。

### 自动生效

系统会自动：
- ✅ 加载所有磁盘技能（`.agents/skills/`）
- ✅ 根据用户消息智能匹配相关技能
- ✅ 自动加载核心技能（身份、交互风格）
- ✅ 处理技能依赖关系
- ✅ 缓存技能以提高性能

### 验证系统

运行测试脚本验证系统正常工作：

```bash
npx tsx scripts/test-skill-system.ts
```

## 添加新技能

### 步骤 1: 创建技能文件

在 `.agents/skills/` 目录下创建新文件夹和 `SKILL.md` 文件：

```bash
mkdir -p .agents/skills/my-new-skill
```

### 步骤 2: 编写技能内容

创建 `.agents/skills/my-new-skill/SKILL.md`：

```markdown
---
name: 我的新技能
description: 这个技能的简短描述
keywords: 关键词1, 关键词2, 关键词3
priority: 80
dependencies: other-skill-id
autoLoad: false
---

# 技能标题

这里是技能的详细内容...

## 使用场景

- 场景 1
- 场景 2

## 示例

\`\`\`json
{
  "example": "示例内容"
}
\`\`\`
```

### 步骤 3: 配置元数据

#### name（必填）
技能的显示名称

#### description（必填）
简短描述，用于技能清单

#### keywords（必填）
逗号分隔的关键词列表，用于匹配用户消息

**关键词选择技巧：**
- 使用用户可能输入的词汇
- 包含同义词和相关词
- 避免过于宽泛的词（如"帮助"）
- 短关键词（1-2字）需要更精确的上下文

#### priority（可选）
优先级，数字越大越优先（默认 0）

**推荐优先级：**
- 100: 核心身份（自动加载）
- 90-95: 关键功能（设备控制、执行流程）
- 80-89: 重要功能（自动化、视觉巡检）
- 70-79: 辅助功能（销售、营销）

#### dependencies（可选）
依赖的其他技能 ID，逗号分隔

当此技能被匹配时，依赖的技能会自动加载

#### autoLoad（可选）
是否自动加载（默认 false）

设置为 true 的技能会在所有对话中加载，适合核心身份和交互规范

### 步骤 4: 测试技能

重启开发服务器或等待 5 分钟缓存过期，然后测试：

```bash
# 清除缓存（可选）
# 在代码中调用: skillManager.clearCache()

# 测试匹配
npx tsx scripts/test-skill-system.ts
```

## 技能匹配规则

### 1. 关键词匹配

系统会检查用户消息是否包含技能的关键词：

```typescript
// 用户消息: "帮我开启风扇"
// 匹配技能: hardware-control (关键词: 开启, 风扇)
```

**短关键词特殊处理：**
- 1-2字的关键词需要上下文验证
- 例如"开"需要同时包含动作词和设备词

### 2. 意图匹配

基于预定义的意图规则匹配：

```typescript
// 控制意图: 控制|指令|操作|设备 → iot-control
// 规划意图: 帮我|建议|优化|计划 → implementation-workflow
// 巡检意图: 看|监控|截图|巡检 → vision-inspection
// 自动化意图: 自动化|策略|规则|联动 → automation-strategy
```

### 3. 依赖匹配

当一个技能被匹配时，其依赖的技能会自动加载：

```typescript
// 匹配 automation-strategy
// 自动加载 iot-control (依赖)
```

### 4. 自动加载

`autoLoad: true` 的技能总是加载：

```typescript
// 核心身份 (ai-identity)
// 交互风格 (communication-style)
```

## 技能优先级

技能按以下顺序排序：

1. **优先级** (priority 字段)
2. **匹配分数** (matchScore)
3. **来源优先级** (builtin > disk > database)

## 性能优化

### 缓存机制

- 技能加载结果缓存 5 分钟
- 按用户和配置分别缓存
- 自动过期和清理

### 手动清除缓存

```typescript
import { skillManager } from '@/lib/ai/skill-system/skill-manager';

// 清除所有缓存
skillManager.clearCache();

// 清除特定用户的缓存
skillManager.clearCache(userId);
```

## 高级用法

### 直接使用技能管理器

```typescript
import { skillManager } from '@/lib/ai/skill-system/skill-manager';

// 获取所有技能
const allSkills = await skillManager.getAllSkills({
  enableBuiltinSkills: true,
  enableDiskSkills: true,
  enableDatabaseSkills: true,
  userId: 123
});

// 匹配技能
const matches = await skillManager.matchSkills({
  userMessage: '帮我开启风扇',
  userId: 123
});

// 生成提示词
const result = await skillManager.generatePromptContent({
  userMessage: '帮我开启风扇',
  userId: 123
});
```

### 自定义匹配器

在 `lib/ai/skill-system/matchers.ts` 中添加新的匹配器：

```typescript
export class MyCustomMatcher {
  match(skill: Skill, context: SkillMatchContext): SkillMatchResult | null {
    // 自定义匹配逻辑
    if (/* 匹配条件 */) {
      return {
        skill,
        matchScore: 85,
        matchReason: '自定义匹配'
      };
    }
    return null;
  }
}
```

然后在 `SkillMatcher` 中集成。

### 自定义加载器

在 `lib/ai/skill-system/loaders.ts` 中添加新的加载器：

```typescript
export class MyCustomLoader {
  async load(): Promise<Skill[]> {
    // 从自定义来源加载技能
    return [];
  }
}
```

然后在 `SkillLoader` 中集成。

## 最佳实践

### 1. 技能粒度

- ✅ 每个技能专注一个领域
- ✅ 避免技能过大或过小
- ✅ 相关功能可以拆分为多个技能

### 2. 关键词选择

- ✅ 选择具有代表性的关键词
- ✅ 包含同义词和相关词
- ✅ 避免过于宽泛的词
- ❌ 不要使用停用词（的、了、吗）

### 3. 依赖管理

- ✅ 合理使用依赖关系
- ✅ 避免循环依赖
- ✅ 依赖链不要太长（建议 ≤3 层）

### 4. 优先级设置

- ✅ 核心技能设置高优先级（90-100）
- ✅ 辅助技能设置中等优先级（70-89）
- ✅ 可选技能设置低优先级（<70）

### 5. 内容组织

- ✅ 使用 Markdown 格式
- ✅ 结构清晰，层次分明
- ✅ 包含使用示例
- ✅ 提供代码示例

## 故障排查

### 技能未被匹配

**可能原因：**
1. 关键词不准确
2. 优先级太低
3. 缓存未更新

**解决方法：**
1. 检查关键词是否包含用户可能输入的词
2. 提高优先级
3. 清除缓存或等待 5 分钟

### 技能冲突

**可能原因：**
1. 多个技能有相同的关键词
2. 优先级设置不合理

**解决方法：**
1. 调整关键词，使其更具体
2. 调整优先级，明确主次关系

### 性能问题

**可能原因：**
1. 技能数量过多
2. 技能内容过大
3. 缓存未生效

**解决方法：**
1. 合并相似技能
2. 精简技能内容
3. 检查缓存配置

## 常见问题

### Q: 如何禁用某个技能？

A: 删除或重命名技能文件夹，或在 frontmatter 中添加 `enabled: false`（需要修改加载器支持）

### Q: 如何查看当前加载了哪些技能？

A: 运行测试脚本或在代码中调用 `skillManager.getAllSkills()`

### Q: 如何调试技能匹配？

A: 在 `skillManager.matchSkills()` 中添加 console.log 查看匹配过程

### Q: 技能内容可以包含代码吗？

A: 可以，使用 Markdown 代码块格式

### Q: 如何更新技能内容？

A: 直接编辑 `.agents/skills/xxx/SKILL.md` 文件，等待缓存过期或手动清除缓存

## 相关文档

- [架构文档](../lib/ai/skill-system/README.md)
- [迁移指南](../AGENT_FRAMEWORK_MIGRATION.md)
- [迁移完成报告](../MIGRATION_COMPLETED.md)

## 技术支持

如有问题，请查看：
1. 测试脚本输出
2. 控制台日志
3. 技能系统源码注释
