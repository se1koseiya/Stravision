# 技能系统架构文档

## 概述

新的技能系统采用模块化、可扩展的架构，解决了旧系统的以下问题：
- 技能定义重复冗余
- 路由逻辑过于复杂
- 扩展性差
- 缺乏统一的管理接口

## 架构设计

### 核心组件

```
skill-system/
├── types.ts           # 类型定义
├── loaders.ts         # 技能加载器（磁盘、数据库、内置）
├── matchers.ts        # 技能匹配器（关键词、意图、依赖）
├── skill-manager.ts   # 统一管理接口
└── index.ts          # 导出入口
```

### 设计原则

1. **单一职责**: 每个模块只负责一个功能
2. **开放封闭**: 易于扩展，无需修改核心代码
3. **依赖倒置**: 依赖抽象接口，不依赖具体实现
4. **可测试性**: 所有组件都可独立测试

## 使用指南

### 基础用法

```typescript
import { skillManager } from './skill-system/skill-manager';

// 获取所有技能
const skills = await skillManager.getAllSkills({
  enableDiskSkills: true,
  enableDatabaseSkills: true,
  userId: 123
});

// 匹配相关技能
const matches = await skillManager.matchSkills({
  userMessage: '帮我开启风扇',
  userId: 123
});

// 生成提示词内容
const { content, matchedSkills } = await skillManager.generatePromptContent({
  userMessage: '帮我开启风扇',
  userId: 123
});
```

### 创建新技能

#### 方式 1: 磁盘技能（推荐）

在 `.agents/skills/` 目录下创建新文件夹，添加 `SKILL.md`：

```markdown
---
name: 新技能名称
description: 技能描述
keywords: 关键词1, 关键词2, 关键词3
priority: 80
dependencies: other-skill-id
autoLoad: false
---

# 技能内容

这里是技能的详细内容...
```

#### 方式 2: 数据库技能

通过 API 或管理界面添加用户自定义技能。

#### 方式 3: 内置技能

在 `loaders.ts` 的 `BuiltinSkillLoader` 中添加：

```typescript
{
  id: 'my-skill',
  name: '我的技能',
  description: '技能描述',
  keywords: ['关键词1', '关键词2'],
  autoLoad: false,
  priority: 90,
  content: '技能内容...',
  source: 'builtin'
}
```

### 技能匹配规则

技能匹配采用多策略组合：

1. **关键词匹配** (KeywordMatcher)
   - 精确匹配: 分数 85-95
   - 短关键词需要上下文验证
   - 长关键词直接匹配

2. **意图匹配** (IntentMatcher)
   - 基于预定义的意图规则
   - 分数 80-90

3. **依赖匹配** (DependencyMatcher)
   - 自动加载依赖技能
   - 分数 75

4. **自动加载**
   - `autoLoad: true` 的技能总是加载
   - 分数 100

### 技能优先级

技能按以下顺序排序：
1. 优先级 (priority 字段)
2. 匹配分数 (matchScore)
3. 来源优先级 (builtin > disk > database)

## 迁移指南

### 从旧系统迁移

1. **更新导入**

```typescript
// 旧代码
import { getRelevantSkillsContentForUser } from './lib/ai/skill-router';

// 新代码
import { getRelevantSkillsContentForUser } from './lib/ai/skill-router-v2';
```

2. **迁移硬编码技能**

将 `skill-definitions.ts` 中的 `SKILLS` 数组迁移到磁盘技能或内置技能。

3. **简化路由逻辑**

删除 `skill-router.ts` 中的硬编码匹配规则，使用新的匹配器。

### 兼容性

新系统提供了兼容旧接口的包装函数，可以无缝替换：

```typescript
// 这两个函数签名完全兼容
getRelevantSkillsContentForUser(message, userId, enabled);
```

## 扩展指南

### 添加新的匹配策略

在 `matchers.ts` 中创建新的匹配器类：

```typescript
export class MyCustomMatcher {
  match(skill: Skill, context: SkillMatchContext): SkillMatchResult | null {
    // 自定义匹配逻辑
    return { skill, matchScore: 80, matchReason: '自定义匹配' };
  }
}
```

然后在 `SkillMatcher` 中集成：

```typescript
export class SkillMatcher {
  private myMatcher = new MyCustomMatcher();
  
  matchSkills(skills: Skill[], context: SkillMatchContext): SkillMatchResult[] {
    // 添加新的匹配逻辑
  }
}
```

### 添加新的技能来源

在 `loaders.ts` 中创建新的加载器：

```typescript
export class MyCustomLoader {
  async load(): Promise<Skill[]> {
    // 从自定义来源加载技能
    return [];
  }
}
```

然后在 `SkillLoader` 中集成。

## 性能优化

1. **缓存机制**: 技能加载结果缓存 5 分钟
2. **懒加载**: 只在需要时加载技能内容
3. **去重**: 自动去除重复技能

## 测试

```bash
# 运行测试
npm test lib/ai/skill-system

# 测试覆盖率
npm run test:coverage
```

## 最佳实践

1. **技能粒度**: 每个技能专注一个领域
2. **关键词选择**: 选择具有代表性的关键词，避免过于宽泛
3. **依赖管理**: 合理使用依赖关系，避免循环依赖
4. **优先级设置**: 核心技能设置高优先级（90-100）
5. **内容组织**: 技能内容使用 Markdown 格式，结构清晰

## 故障排查

### 技能未被匹配

1. 检查关键词是否准确
2. 查看匹配日志（开启 debug 模式）
3. 验证技能是否正确加载

### 技能冲突

1. 检查技能 ID 是否重复
2. 调整优先级
3. 使用依赖关系明确加载顺序

### 性能问题

1. 检查缓存是否生效
2. 减少技能数量
3. 优化匹配规则

## 未来规划

- [ ] 支持技能版本管理
- [ ] 添加技能热重载
- [ ] 实现技能市场
- [ ] 支持技能组合（Skill Composition）
- [ ] 添加可视化技能编辑器
