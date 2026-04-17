# Agent 监控面板访问指南

## 📍 访问路径

### 直接访问
```
http://localhost:3000/admin/agent-monitor
```

或在生产环境：
```
https://your-domain.com/admin/agent-monitor
```

## 🎯 功能概览

Agent 监控中心包含两个主要标签页：

### 1. 性能监控 (Performance)
- **实时性能指标**: 响应时间、成功率、错误率
- **工具调用统计**: 各个工具的使用频率和性能
- **趋势图表**: 使用 recharts 展示性能趋势
- **系统健康状态**: 整体系统运行状况

### 2. 告警管理 (Alerts)
- **实时告警**: 系统异常和性能问题告警
- **告警历史**: 历史告警记录
- **告警配置**: 告警阈值设置

## 🔐 权限要求

访问 Agent 监控面板需要：
- 管理员权限 (admin 或 super_admin)
- 已登录状态

## 🚀 快速访问方式

### 方式 1: 直接输入 URL
在浏览器地址栏输入：
```
/admin/agent-monitor
```

### 方式 2: 从管理后台导航
建议在管理后台添加导航链接。

## 📊 监控指标说明

### 性能指标
- **平均响应时间**: Agent 处理请求的平均耗时
- **成功率**: 成功完成的请求占比
- **错误率**: 失败请求占比
- **并发数**: 当前活跃的 Agent 会话数

### 工具统计
- **调用次数**: 每个工具被调用的总次数
- **平均耗时**: 每个工具的平均执行时间
- **成功率**: 每个工具的成功执行率
- **错误类型**: 常见错误分类

## 🎨 界面预览

```
┌─────────────────────────────────────────────────────────┐
│  Agent 监控中心                                          │
│  实时监控 AI Agent 的性能指标和系统告警                   │
├─────────────────────────────────────────────────────────┤
│  [性能监控] [告警管理]                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 性能概览                                             │
│  ┌─────────────┬─────────────┬─────────────┐           │
│  │ 响应时间    │ 成功率      │ 错误率      │           │
│  │ 2.3s        │ 98.5%       │ 1.5%        │           │
│  └─────────────┴─────────────┴─────────────┘           │
│                                                         │
│  📈 性能趋势图                                           │
│  [折线图显示最近的性能数据]                              │
│                                                         │
│  🔧 工具调用统计                                         │
│  [柱状图显示各工具的使用情况]                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🔧 添加导航链接

### 在管理后台添加快捷入口

编辑 `app/admin/page.tsx`，在导航区域添加：

```typescript
// 在 header 部分添加快捷按钮
<div className="flex items-center gap-6">
  <Link href="/admin/agent-monitor">
    <button className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
      <Activity className="size-5" />
      <span className="text-sm font-medium">Agent 监控</span>
    </button>
  </Link>
  <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
    <Bell className="size-5" />
  </button>
  {currentUser && <UserAvatarMenu user={currentUser} />}
</div>
```

或者在 Tabs 中添加新标签：

```typescript
<TabsTrigger
  value="agent-monitor"
  className="rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent px-4 pb-4 pt-2 font-mono text-sm uppercase tracking-wider text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
>
  Agent Monitor
</TabsTrigger>
```

## 📱 相关页面

### Agent 编排页面
```
/admin/agent-orchestration
```
用于配置和管理 Agent 工作流。

### 主管理后台
```
/admin
```
系统管理主页面。

## 🐛 故障排查

### 问题 1: 页面无法访问
**可能原因**:
- 未登录或权限不足
- 路由配置错误

**解决方案**:
1. 确认已登录且具有管理员权限
2. 检查 URL 是否正确
3. 查看浏览器控制台错误信息

### 问题 2: 数据不显示
**可能原因**:
- API 端点错误
- 没有活跃的 Agent 会话

**解决方案**:
1. 检查 `/api/admin/agent-metrics` 是否正常
2. 先使用 AI 助手创建一些会话
3. 刷新页面重新加载数据

### 问题 3: 图表不显示
**可能原因**:
- recharts 依赖未安装

**解决方案**:
```bash
npm install recharts --legacy-peer-deps
```

## 📈 使用建议

### 日常监控
1. 每天查看性能趋势，识别异常
2. 关注错误率变化
3. 检查告警信息

### 性能优化
1. 识别响应时间较长的工具
2. 分析高频调用的工具
3. 优化瓶颈环节

### 问题诊断
1. 查看错误日志
2. 分析失败的工具调用
3. 追踪异常会话

## 🎯 下一步

### 建议改进
1. 在主导航添加快捷入口
2. 添加实时推送功能
3. 支持自定义监控指标
4. 导出监控报告

### 相关文档
- `AGENT_ORCHESTRATOR_INTEGRATION.md` - Agent 编排器集成文档
- `WEEK_7-8_MONITORING_TESTING.md` - 监控和测试文档
- `BUILD_FIX_SUMMARY.md` - 构建修复说明

---

**访问地址**: `/admin/agent-monitor`  
**权限要求**: 管理员  
**状态**: ✅ 可用
