# Berry Realm Playbook

> 智慧农业平台 Berry Realm（莓小智）项目的开发规范 Skill，供 Trae / Trae Work 等 AI 助手在二次开发、协作开发、bug 修复或重构时自动加载使用。

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](./VERSION)
[![Trae Skill](https://img.shields.io/badge/Trae-Skill-1677ff.svg)](https://trae.ai/)

## 简介

本 skill 熔炼自 Berry Realm 项目所有者积累的开发偏好、项目硬约束、踩坑记录与架构模式，覆盖：

- **UI/UX 设计规范** — Ant Design + lucide-react + A2UI/XCard，禁止 emoji 与橙色渐变
- **配置与魔数规则** — 所有阈值/上限/倍数必须 admin 可配置，禁止硬编码
- **流式响应与渲染规则** — SSE 格式、新增 UI 标签三件套、JSON 修复、Schedule/Automation 保护
- **数据库与 API 规范** — Next.js 15 params Promise、PostgreSQL 42P08 陷阱、事务删除模式
- **AI 助手开发规范** — Agent Loop、子智能体（thinking 参数分模型）、CHECKPOINT、Plan Mode、KB 市场 4 层架构
- **硬件控制安全** — dry_run 强制、五层架构、三大闭环
- **开发协作模式** — 不跑 tsc、结对编程、反馈优先

## 安装

### 方式一：解压安装（推荐）

1. 解压 `berry-realm-playbook.zip` 到任意临时目录
2. 把整个 `berry-realm-playbook/` 文件夹复制到项目的 `.trae/skills/` 目录下：

   ```
   <项目根目录>/
   └── .trae/
       └── skills/
           └── berry-realm-playbook/
               ├── SKILL.md          # 核心规范文档
               ├── README.md          # 本说明
               ├── LICENSE            # Apache 2.0
               ├── VERSION            # 版本号
               └── manifest.json      # 发布清单
   ```

3. 重启 Trae / Trae Work，或新建对话，skill 会自动加载

### 方式二：手动创建

```bash
mkdir -p .trae/skills/berry-realm-playbook
cd .trae/skills/berry-realm-playbook
# 将 SKILL.md 等文件放入此目录
```

## 使用

### 自动调用

skill 安装后会自动在 Trae 中注册。当你在对话中提到下列场景时，Trae 会自动加载本规范：

- 修改 Berry Realm 项目代码
- 修复 bug 或重构
- 新增 UI 组件、API、AI 功能
- 调整数据库 schema
- 调整硬件控制逻辑

### 主动查阅

也可在对话中明确指示：

```
请参考 berry-realm-playbook 第 3.2 节，新增 UI 标签规则
```

```
按 berry-realm-playbook 规范实现这个功能
```

### 关键词快速定位

遇到错误时，可直接在对话中提到关键词，AI 会从规范中找到对应章节：

| 错误关键词 | 对应章节 |
|------|------|
| `42P08` / `绑定消息提供了 N 个参数` | §4.2 / §4.3 PostgreSQL 参数化陷阱 |
| `Rendered more hooks` | §3.9 React Hooks 顺序 |
| `Cannot update a component while rendering` | §3.9 React Hooks 顺序 |
| `Maximum update depth exceeded` | §3.10 XMarkdown |
| `params is a Promise` | §4.1 Next.js 15 params |
| `params is a Promise and must be unwrapped` | §4.1 Next.js 15 params |
| `message.error is not a function` | §1.5 Ant Design App context |
| `Static function can not consume context` | §1.5 Ant Design 静态 API 警告 |
| `Expected a semicolon` | §1.6 TypeScript 对象字面量陷阱 |
| `InvalidParameter: Invalid combination of reasoning_effort` | §5.2 子智能体 thinking 参数 |
| `Arrearage` | §5.12 DashScope 错误处理 |

## 卸载

删除 `.trae/skills/berry-realm-playbook/` 整个目录即可：

```bash
rm -rf .trae/skills/berry-realm-playbook
```

## 升级

1. 解压新版 `berry-realm-playbook.zip`
2. 替换 `.trae/skills/berry-realm-playbook/` 目录下所有文件
3. 查看新版 [VERSION](./VERSION) 和 [CHANGELOG](./CHANGELOG.md)（如有）

## 兼容性

- **Trae IDE / Trae Work**：原生支持
- **Claude Code / Cursor 等支持 skill 机制的 AI 助手**：可手动将 SKILL.md 内容粘入对应规则文件
- **Berry Realm 版本**：v4.0+

## 内容统计

- **10 章节**（UI/UX、配置、流式、DB/API、AI、硬件、数据、协作、文件路径、调用建议）
- **150+ 条硬约束**（含 30+ CRITICAL 级别）
- **25 条用户偏好**（已熔入对应章节）
- **50+ 条踩坑记录**（来自实际开发）

## 贡献

欢迎补充新的踩坑记录或规范条目。提交 PR 时请：

1. 在对应章节追加条目，标注 `（CRITICAL）` 或普通级别
2. 更新 [VERSION](./VERSION)（语义化版本）
3. 在 [CHANGELOG.md](./CHANGELOG.md) 追加变更说明

## 许可证

[Apache License 2.0](./LICENSE) - Copyright 2026 Berry Realm Contributors
