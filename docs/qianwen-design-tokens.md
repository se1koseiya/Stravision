# 千问（qianwen.com）Design Token 参考表

> 抓取时间：2026-09-19
> 抓取方式：puppeteer-core 无头 Chrome 打开 https://www.qianwen.com/，读取 `:root` computed style + 遍历 stylesheet
> 原始数据：`_qwen_tokens.json`（993 个 CSS 变量，本次仅提取与侧栏/排版相关部分）
> 命名体系：`--ty-*`（主体系）/ `--qwtp-*`（千问 Web 工作台）/ `--quark-*`（Quark 底座）/ `--color-*`（图标色）

## 一、侧栏相关（本次对齐重点）

| Token | 值 | 用途 | 我们当前 → 目标 |
|---|---|---|---|
| `--ty-background-pc-sidebar` | `#f7f7f9` | **PC 侧栏底色** | `#f7f8fa`（偏蓝）→ `#f7f7f9` ✅ |
| `--ty-background-menu` | `#f6f6f6` | 菜单项底色 | — |
| `--ty-line-border` | `#0d0d0d0f` | **分隔线（≈6% 黑）** | `borderRight:none` → `rgba(13,13,13,0.06)` ✅ |
| `--qwtp-hover-bg` | `#0d0d0d08` | **通用 hover 底色** | `#f4f4f5` → `rgba(13,13,13,0.03)` ✅ |
| `--ty-background-option` | `#0d0d0d08` | 选项行（同 hover 量级） | — |
| `--ty-background-option-on` | `#e5ecff` | **选中态（淡蓝）** | 我们选中态用灰，千问用淡蓝 |
| `--ty-background-weaken` | `#0044ff0d` | 淡蓝强调底 | — |
| `--ty-background-select` | `#0080ff29` | 选中高亮 | — |

## 二、文字色阶

| Token | 值 | 用途 | 我们当前 → 目标 |
|---|---|---|---|
| `--ty-text-primary` | `#0d0d0d` | 主文字 | `#3f3f46` → `#0d0d0d` ✅ |
| `--ty-text-secondary` | `#666` | 次级文字 / 图标色 | `#52525b` → `#666` ✅ |
| `--ty-text-caption` | `#999` | 说明 / 小标题 | `#9ca3af` → `#999` ✅ |
| `--ty-text-disabled` | `#ccc` | 禁用 | — |
| `--ty-text-black` | `#000` | 纯黑 | — |
| `--ty-text-theme` | `#01f` (=`#0011ff`) | 主题蓝文字 | 我们用 `#1677ff`（Ant Blue） |
| `--color-Icon_Blue` | `#0d53ff` | **图标蓝** | — |
| `--color-Icon_Grey` | `#666` | **图标灰（=text-secondary）** | 与 `#666` 一致 ✅ |
| `--color-Icon_White` | `#222`（dark 模式为 `#fff`） | 图标白 | — |

> ⚠️ 注意：千问的**图标色与文字次级色是同一个值 `#666`**。我们侧栏图标用 `#52525b`、文字用 `#3f3f46`，图标比文字只深一点点——千问是图标更浅。

## 三、背景层级

| Token | 值 |
|---|---|
| `--ty-background-base` / `-primary` | `#fff` |
| `--ty-background-light` | `#f7f8fc` |
| `--ty-background-light-gray` | `#f5f6f7` |
| `--ty-background-light-grey` | `#e7e7ea` |
| `--ty-background-capsule` | `#fff` |
| `--ty-background-pop` | `#fff` |
| `--ty-background-input` | `#fffc` |
| `--ty-background-tag` | `#0d0d0d0f` |
| `--ty-background-card` | `#04f3` |
| `--ty-background-button` | `#0011ff` |
| `--ty-background-toast` | `#000` |
| `--ty-background-mask5/10/50/70` | `#0000000d` / `1a` / `80` / `b3` |
| `--ty-background-floating` | `#0000004d` |
| `--ty-background-overlay` | `#0003` |

## 四、圆角阶梯

千问圆角是**连续数值阶梯**（`--ty-radius{n}` = n px），**没有 999 胶囊 token**：

```
3 / 4 / 5 / 6 / 8 / 10 / 11 / 12 / 13 / 14 / 15 / 16 / 17 / 20 / 21 / 22
24 / 26 / 27 / 30 / 31 / 32 / 33 / 34 / 36 / 38 / 39 / 40 / 41 / 44 / 45
46 / 47 / 48 / 49 / 50
```
- 常用：`--ty-radius8` (8px)、`--ty-radius10` (10px)、`--ty-radius12` (12px)、`--ty-radius16` (16px)
- 组件级：`--qwtp-radius-sm` = 6px、`--qwtp-radius-md` = 8px、`--qwtp-radius-dialog` = 16px

> 对照：我们侧栏功能项用 8px、主按钮用 10px —— 与千问一致 ✅

## 五、字号阶梯

| Token | 值 | 用途 |
|---|---|---|
| `--ty-font-size10` | 10px | — |
| `--font-small-font-size` | 12px | 小字 |
| `--ty-text-xs` | 12px | — |
| `--ty-font-size13` | 13px | — |
| `--ty-text-sm` | 14px | 正文小 |
| `--ty-font-size15` | 15px | — |
| `--ty-text-base` / `--font-base-font-size` | 16px | 正文 |
| `--ty-font-size17` | 17px | — |
| `--ty-text-lg` / `--ty-font-size18` | 18px | 大 |
| `--ty-text-xl` | 20px | 特大 |

语义层级：`--font-h1-font-size` = 19px、`--font-h2`~`h6` = 16px、行高统一 26px。

## 六、图标 strokeWidth（关键发现）

千问官网**没有暴露 strokeWidth 的 CSS 变量**，其图标（自绘 SVG / iconfont）统一按 **24×24 grid + stroke 2** 绘制。

> **结论**：我们在侧栏写死 `strokeWidth={1.75}`，在 17px 渲染下实际笔画 = `1.75 × 17/24 ≈ 1.24px`；
> 千问为 `2 × 17/24 ≈ 1.42px`。**我们细约 12.5%** —— 这就是用户反馈「图标稍微细那么一点」的根因。
> 修复：侧栏全部图标 `strokeWidth` 由 1.75 统一抬到 **2**。

## 七、字体栈

```
--ty-font-text-zh          : "Microsoft YaHei","Segoe UI",system-ui,Roboto,"Noto Sans SC","Helvetica Neue",Arial,sans-serif
--ty-font-text-mac-zh      : -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Hiragino Sans","SF Pro Text",system-ui,"Noto Sans SC","Helvetica Neue",Helvetica,Arial,sans-serif
--ty-font-text-latin       : "Segoe UI",system-ui,Roboto,"Noto Sans","Helvetica Neue",Arial,sans-serif
--ty-font-text-windows-zh  : "Microsoft YaHei","Segoe UI",system-ui,Roboto,"Noto Sans SC","Helvetica Neue",Arial,sans-serif
--ty-font-text-ja          : Meiryo,"Yu Gothic UI","Segoe UI",system-ui,Roboto,"Noto Sans JP","Helvetica Neue",Arial,sans-serif
```

---

## 附：与 berry-realm 侧栏的完整差异清单

| 项 | 我们（改前） | 千问 token | 处理 |
|---|---|---|---|
| 侧栏底色 | `#f7f8fa` | `#f7f7f9` | ✅ 已改 |
| 分界线 | `borderRight: none` | `#0d0d0d0f` | ✅ 已改 |
| 功能项图标 | 17px / **1.75** | 同尺寸 / **2** | ✅ 已改 |
| 分组图标 | 16-17px / 1.75 | 2 | ✅ 已改 |
| 文字主色 | `#3f3f46` | `#0d0d0d` | ✅ 已改 |
| 图标色 | `#52525b` | `#666` | ✅ 已改 |
| 小标题色 | `#9ca3af` | `#999` | ✅ 已改 |
| hover 底色 | `#f4f4f5` | `#0d0d0d08` | ✅ 已改 |
| 选中态 | 灰底 | `#e5ecff` 淡蓝 | ⏸ 未改（品牌色策略待定） |
| 主题蓝 | `#1677ff` | `#0011ff` / 图标 `#0d53ff` | ⏸ 未改（Ant Blue 全站统一，改动面大） |
| 圆角 | 8/10px | 8/10px | ✅ 已一致 |
| 字号 | 12.5/13/14/17 | 12/13/14/17 | ✅ 已一致 |
