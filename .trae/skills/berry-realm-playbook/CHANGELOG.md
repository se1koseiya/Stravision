# Changelog

本文件记录 Berry Realm Playbook skill 的版本变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-07-24

### Added

- 首次发布
- 10 章节核心规范：
  - §1 UI/UX 设计规范（Ant Design、lucide-react 1.75、XCard/A2UI、禁 emoji/橙渐变）
  - §2 配置与魔数规则（所有阈值 admin 可配置）
  - §3 流式响应与渲染规则（SSE、UI 标签三件套、JSON 修复、Schedule/Automation 保护）
  - §4 数据库与 API 规范（Next.js 15 params、PostgreSQL 42P08、事务删除）
  - §5 AI 助手开发规范（Agent Loop、子智能体、CHECKPOINT、Plan Mode、KB 市场）
  - §6 硬件控制安全（dry_run、五层架构、三大闭环）
  - §7 数据规范（时间戳兼容、禁模拟数据）
  - §8 开发协作模式（不跑 tsc、结对编程、反馈优先）
  - §9 关键文件路径参考
  - §10 调用建议
- Apache 2.0 LICENSE
- README.md 安装/使用/卸载说明
- manifest.json 发布清单
- VERSION 版本元数据
- 错误关键词快速定位表（11 个常见错误映射到对应章节）

### Sources

熔炼自：
- `user_profile.md`（25 条用户偏好）
- `project_memory.md`（150+ 条项目硬约束与陷阱）
- 近两周 `topics.md`（50+ 条开发主题记录）
