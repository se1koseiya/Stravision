# Agent 框架优化迁移指南

## 问题分析

### 旧框架存在的问题

1. **技能定义重复冗余**
   - `skill-definitions.ts` 硬编码技能数组
   - `.agents/skills/` 磁盘技能
   - 数据库用户技能
   - 三种来源混杂，维护困难

2. **路由逻辑过于复杂**
   - `skill-router.ts` 包含大量硬编码规则
   - 关键词匹配逻辑不灵活
   - 意图识别规则分散

3. **扩展性差**
   - 添加新技能需要修改多处代码
   - 技能依赖关系不清晰
   - 缺乏统一的管理接口

4. **可测试性差**
   - 组件耦合度高
   - 难以进行单元测试

## 新架构设计

### 核心改进

1. **模块化设计**
   ```
   skill-system/
   ├── types.ts          # 统一类型定义
   ├── loaders.ts        # 技能加载器（分离关注点）
   ├── matchers.ts       # 技能匹配器（策略模式）
   ├── skill-manager.ts  # 统一管理接口（门面模式）
   └── index.ts         # 导出入口
   ```

2. **清晰的职责分离**
   - **Loaders**: 负责从不同来源加载技能
   - **Matchers**: 负责匹配相关技能
   - **Manager**: 提供统一的对外接口

3. **灵活的匹配策略**
   - 关键词匹配（支持上下文验证）
   - 意图匹配（基于语义规则）
   - 依赖匹配（自动加载依赖技能）
   - 自动加载（核心技能）

4. **性能优化**
   - 技能缓存（5分钟 TTL）
   - 懒加载
   - 智能去重

## 迁移步骤

### 第一阶段：准备工作（已完成）

- [x] 创建新的技能系统目录结构
- [x] 实现核心组件
- [x] 编写文档和测试

### 第二阶段：逐步迁移

#### 1. 迁移硬编码技能到磁盘

将 `skill-definitions.ts` 中的技能迁移到 `.agents/skills/`：

```bash
# 示例：迁移 task-planning 技能
mkdir -p .agents/skills/task-planning
cat > .agents/skills/task-planning/SKILL.md << 'EOF'
---
name: 任务规划与 SOP
description: 复杂任务的规划和执行流程管理
keywords: 计划, 方案, 步骤, 如何, 优化, 任务, 清单
priority: 85
dependencies: implementation-workflow
---

## 任务规划能力
...
EOF
```

#### 2. 更新 API 路由

在 `app/api/chat/route.ts` 中：

```typescript
// 旧代码
import { getRelevantSkillsContentForUser } from '@/lib/ai/skill-router';

// 新代码（逐步替换）
import { getRelevantSkillsContentForUser } from '@/lib/ai/skill-router-v2';
```

#### 3. 测试验证

```bash
# 运行测试确保功能正常
npm test

# 手动测试关键场景
# - 设备控制
# - 任务规划
# - 视觉巡检
# - 自动化策略
```

#### 4. 清理旧代码

确认新系统稳定后：

```bash
# 备份旧文件
mv lib/ai/skill-router.ts lib/ai/skill-router.ts.backup
mv lib/ai/skill-definitions.ts lib/ai/skill-definitions.ts.backup

# 重命名新文件
mv lib/ai/skill-router-v2.ts lib/ai/skill-router.ts
```

### 第三阶段：优化现有技能

#### 1. 添加元数据

为现有技能添加 frontmatter 元数据：

```markdown
---
name: 技能名称
description: 简短描述
keywords: 关键词1, 关键词2
priority: 80
dependencies: 依赖的技能ID
autoLoad: false
---
```

#### 2. 优化关键词

根据实际使用情况调整关键词：

- 添加常用的同义词
- 移除误触发的关键词
- 增加上下文关键词

#### 3. 建立依赖关系

明确技能之间的依赖：

```yaml
# iot-control 依赖 implementation-workflow
dependencies: implementation-workflow

# automation-strategy 依赖 iot-control
dependencies: iot-control
```

### 第四阶段：增强功能

#### 1. 添加会话上下文

```typescript
// 在 SkillMatchContext 中添加会话历史
interface SkillMatchContext {
  userMessage: string;
  userId?: number;
  sessionContext?: {
    previousSkills: string[];
    conversationHistory: Message[];
  };
}
```

#### 2. 实现技能组合

```typescript
// 支持多个技能协同工作
const compositeSkill = skillManager.composeSkills([
  'iot-control',
  'implementation-workflow',
  'agriculture-expert'
]);
```

#### 3. 添加技能分析

```typescript
// 分析技能使用情况
const analytics = await skillManager.getSkillAnalytics(userId);
// { mostUsed: 'iot-control', avgMatchScore: 85, ... }
```

## 技能优化建议

### 1. 重组技能结构

建议将现有技能重组为：

```
核心技能（autoLoad: true）
├── core-identity      # 身份定位
└── ui-tags           # UI 标签

领域技能
├── agriculture-expert # 农业知识
├── crop-disease      # 病虫害
└── strawberry-sales  # 销售策略

功能技能
├── iot-control       # 设备控制
├── implementation-workflow # 执行流程
└── automation-strategy # 自动化策略
```

### 2. 优化技能内容

#### iot-control 技能

```markdown
---
name: 物联网设备控制
description: 控制大棚内的各种 IoT 设备
keywords: 控制, 开, 关, 设备, 水泵, 风扇, 灯, 摄像头
priority: 90
dependencies: implementation-workflow
---

# 核心设备映射（极其重要）

| 设备编号 | 设备名称 | 功能 |
|---------|---------|------|
| 5 | 水泵 | 灌溉、加湿 |
| 6 | 风扇 | 通风、降温 |
| 7 | 植物全光谱补光灯 | 作物光照 |
| 8 | 光照植物补光灯 | 环境照明 |

⚠️ **严禁使用 1, 2, 3, 4 等其他编号！**

...
```

#### implementation-workflow 技能

```markdown
---
name: 任务执行工作流
description: 复杂任务的规划和执行流程
keywords: 计划, 步骤, 执行, 验证, 托管
priority: 85
autoLoad: false
---

# 6-Step 执行流程

1. **任务规划**: 分解目标为可执行步骤
2. **顺序执行**: 一次执行一个步骤
3. **操作前检查**: 验证当前状态
4. **生成指令**: 输出控制命令
5. **操作后验证**: 确认执行结果
6. **推进任务**: 更新状态并继续

...
```

### 3. 添加新技能

#### 示例：数据分析技能

```bash
mkdir -p .agents/skills/data-analysis
cat > .agents/skills/data-analysis/SKILL.md << 'EOF'
---
name: 数据分析专家
description: 分析传感器数据趋势和异常
keywords: 分析, 趋势, 数据, 图表, 统计
priority: 75
dependencies: agriculture-expert
---

# 数据分析能力

## 趋势分析
- 温湿度变化趋势
- 光照周期分析
- CO2 浓度波动

## 异常检测
- 突变检测
- 阈值告警
- 预测性维护

...
EOF
```

## 测试清单

### 功能测试

- [ ] 技能加载（磁盘、数据库、内置）
- [ ] 关键词匹配
- [ ] 意图匹配
- [ ] 依赖加载
- [ ] 自动加载技能
- [ ] 缓存机制
- [ ] 去重逻辑

### 场景测试

- [ ] "帮我开启风扇" → 匹配 iot-control
- [ ] "制定一个浇水计划" → 匹配 implementation-workflow
- [ ] "草莓叶子有白点" → 匹配 crop-disease
- [ ] "草莓怎么卖" → 匹配 strawberry-sales
- [ ] "创建自动化规则" → 匹配 automation-strategy

### 性能测试

- [ ] 技能加载时间 < 100ms
- [ ] 匹配时间 < 50ms
- [ ] 缓存命中率 > 80%
- [ ] 内存占用合理

## 回滚计划

如果新系统出现问题：

```bash
# 恢复旧文件
mv lib/ai/skill-router.ts.backup lib/ai/skill-router.ts
mv lib/ai/skill-definitions.ts.backup lib/ai/skill-definitions.ts

# 更新导入
# 将所有 skill-router-v2 改回 skill-router
```

## 后续优化

1. **技能市场**
   - 用户可以分享和下载技能
   - 技能评分和评论系统

2. **可视化编辑器**
   - 图形化技能编辑界面
   - 实时预览和测试

3. **智能推荐**
   - 基于使用历史推荐技能
   - 自动优化关键词

4. **版本管理**
   - 技能版本控制
   - 回滚和升级机制

## 总结

新的技能系统架构具有以下优势：

✅ **模块化**: 清晰的职责分离，易于维护  
✅ **可扩展**: 轻松添加新技能和匹配策略  
✅ **高性能**: 缓存和懒加载优化  
✅ **易测试**: 组件解耦，便于单元测试  
✅ **向后兼容**: 提供兼容接口，平滑迁移  

建议按照本指南逐步迁移，确保系统稳定性。
