# Stravision 用户层操作手册

> 版本：v4.0 ｜ 适用对象：注册用户（含 free/pro/plus 会员）｜ 更新日期：2026-07-07
>
> 平台定位：莓小智（Berry Smart）—— 基于物联网 + 大模型 + RAG 知识库的智能温室管控平台。

***

## 目录

1. [平台概览](/uploads/docs/stravision-用户层操作手册/#1-平台概览)
2. [账号与认证](/uploads/docs/stravision-用户层操作手册/#2-账号与认证)
3. [AI 助手（核心）](/uploads/docs/stravision-用户层操作手册/#3-ai-助手核心)
4. [仪表板（Dashboard）](/uploads/docs/stravision-用户层操作手册/#4-仪表板dashboard)
5. [实时监控（Monitor）](/uploads/docs/stravision-用户层操作手册/#5-实时监控monitor)
6. [设备控制（Device Control）](/uploads/docs/stravision-用户层操作手册/#6-设备控制device-control)
7. [自动化策略（Automation）](/uploads/docs/stravision-用户层操作手册/#7-自动化策略automation)
8. [MCP 商店与我的 MCP](/uploads/docs/stravision-用户层操作手册/#8-mcp-商店与我的-mcp)
9. [模型商店（Model Store）](/uploads/docs/stravision-用户层操作手册/#9-模型商店model-store)
10. [知识库商店（KB Store）](/uploads/docs/stravision-用户层操作手册/#10-知识库商店kb-store)
11. [个人中心（Profile）](/uploads/docs/stravision-用户层操作手册/#11-个人中心profile)
12. [账户设置（Settings）](/uploads/docs/stravision-用户层操作手册/#12-账户设置settings)
13. [活动动态（Activity）](/uploads/docs/stravision-用户层操作手册/#13-活动动态activity)
14. [订阅与方案（Plans）](/uploads/docs/stravision-用户层操作手册/#14-订阅与方案plans)
15. [企业部署申请（Apply）](/uploads/docs/stravision-用户层操作手册/#15-企业部署申请apply)
16. [帮助与文档](/uploads/docs/stravision-用户层操作手册/#16-帮助与文档)
17. [系统页面](/uploads/docs/stravision-用户层操作手册/#17-系统页面)
18. [常见问题](/uploads/docs/stravision-用户层操作手册/#18-常见问题)

***

## 1. 平台概览

### 1.1 什么是 Stravision

Stravision（莓小智）是一个**面向温室大棚的智能管控平台**。用户可通过 PC 浏览器或移动端登录系统，实时查看温室环境、远程控制设备、配置自动化规则，并借助 AI 助手"莓小智"实现自然语言交互、设备巡检、知识问答与定时任务管理。

### 1.2 角色与会员等级

![](/uploads/docs/stravision-用户层操作手册/attachment/1.webp)

| **角色**              | **标识** | **权限范围**                    |
| ------------------- | ------ | --------------------------- |
| 普通用户（user）          | 灰色徽章   | 浏览/控制个人授权设备、使用 AI 助手、订阅市场资源 |
| 会员（member）          | 蓝色徽章   | 同上 + 会员专属功能（更大 AI 限额）       |
| 管理员（admin）          | 橙色徽章   | 同上 + 部分管理操作（需后台 `/admin`）   |
| 超级管理员（super\_admin） | 红色徽章   | 全部权限                        |

| **会员等级** | **每日 AI 限额**   | **额外余额** |
| -------- | -------------- | -------- |
| free     | 0 次            | 0        |
| pro      | 70 次           | —        |
| plus     | 999999 次（视为无限） | —        |

### 1.3 页面速查

| **路径**                    | **模块**      | **简述**           |
| ------------------------- | ----------- | ---------------- |
| `/`                       | 首页（ArtPage） | 艺术风格首页           |
| `/landing`                | 品牌着陆页       | 产品介绍、功能展示        |
| `/login`                  | 登录          | 邮箱+密码+验证码        |
| `/register`               | 注册          | 邮箱+用户名+密码+邮箱验证   |
| `/forgot-password`        | 忘记密码        | 邮箱验证码重置          |
| `/dashboard`              | 仪表板         | 个性化拖拽式数据面板       |
| `/monitor`                | 实时监控        | 摄像头 A/B 实时画面     |
| `/device-control`         | 设备控制        | 继电器/LED/步进电机控制   |
| `/automation`             | 自动化列表       | 策略卡片网格           |
| `/automation/editor`      | 自动化编辑器      | 图形化拖拽策略编辑        |
| `/ai-assistant` 或 `/chat` | AI 助手       | 莓小智对话主界面         |
| `/mcp-store`              | MCP 商店      | 浏览 MCP 插件        |
| `/my-mcp`                 | 我的 MCP      | 已安装的 MCP 插件      |
| `/model-store`            | 模型商店        | 浏览 AI 模型         |
| `/kb-store`               | 知识库商店       | 浏览市场知识库          |
| `/profile`                | 个人中心        | 账号/会员/设备/活动      |
| `/settings`               | 设置          | 修改个人资料           |
| `/activity`               | 活动动态        | 关注动态、邀请          |
| `/plans`                  | 订阅方案        | free/pro/plus 对比 |
| `/apply`                  | 企业部署        | 企业级方案申请          |
| `/help`                   | 帮助中心        | FAQ 分类检索         |
| `/docs`                   | 文档中心        | 技术文档             |
| `/privacy` `/terms`       | 隐私政策 / 服务条款 | —                |
| `/access-denied`          | 访问被拒绝       | 403 错误页          |
| `/maintenance`            | 维护页         | 维护模式占位           |

### 1.4 公共导航元素

![](/uploads/docs/stravision-用户层操作手册/attachment/2.webp)

* **顶部导航**：Logo（左）+ 页面标题（中）+ 用户头像菜单（右）
* **左侧侧边栏**（部分页面）：模块导航，含折叠按钮
* **页脚**：版权与版本信息

***

## 2. 账号与认证

### 2.1 注册（`/register`）

> 路径：访问 `/login` 后点击"立即注册"，或直接访问 `/register`

页面标题"加入我们"，副标题"创建您的 Stravision ID"。

![](/uploads/docs/stravision-用户层操作手册/attachment/3.webp)

#### 表单字段

| **字段** | **类型**         | **校验规则**      |
| ------ | -------------- | ------------- |
| 邮箱     | Input          | 必填、邮箱格式       |
| 用户名    | Input          | 必填、2-20 字符    |
| 密码     | Input.Password | 必填、至少 8 字符    |
| 邮箱验证码  | 6 位 OTP        | 必填、6 位数字（先获取） |
| 服务条款   | Checkbox       | 必须勾选          |

#### 注册流程

1. 填写邮箱后点击"获取"按钮，**系统弹出阿里云滑块验证码**（Recaptz Widget）。

![](/uploads/docs/stravision-用户层操作手册/attachment/4.webp)

2. 完成滑块验证后自动发送验证码到邮箱（**未验证前不会发送**）。
3. 输入 6 位验证码（验证码 60 秒内可重发，60 秒后显示"重发"按钮）。
4. 填写用户名、密码，勾选"我已阅读并同意《服务条款》和《隐私政策》"。
5. 点击"注册"按钮：
   * 系统先调 `POST /api/auth/verify-email` 验证邮箱；
   * 验证通过后调 `POST /api/auth/register` 创建账号；
   * 成功后自动跳转到登录后首页（移动端 `/home`，PC 端 `/monitor`）。

#### 错误提示

* "邮箱格式不正确"
* "用户名长度需在2-20个字符之间"
* "密码至少需要8个字符"
* "请先获取验证码"
* "请阅读并同意服务条款和隐私政策"

### 2.2 登录（`/login`）

![](/uploads/docs/stravision-用户层操作手册/attachment/5.webp)

页面标题"欢迎回来"，副标题"登录您的 IoT 管控中心"。

#### 表单字段

| **字段** | **类型**               | **校验**  |
| ------ | -------------------- | ------- |
| 邮箱     | Input(type=email)    | 必填、邮箱格式 |
| 密码     | Input(type=password) | 必填      |

#### 登录流程

1. 输入邮箱和密码后，**页面下方会动态滑出阿里云滑块验证码**（条件：邮箱和密码都不为空）。

![](/uploads/docs/stravision-用户层操作手册/attachment/6.webp)

2. 完成滑块验证后才能点击"登录"按钮。
3. 点击"登录"调 `POST /api/auth/login`：
   * **普通情况**：直接跳转。
   * **需要二次验证**（异地登录等安全原因）：弹出"安全验证"对话框，要求邮箱验证码。点击"获取验证码"后输入 6 位 OTP 提交。
   * **安全警告**（轻微风险）：弹出"安全警告"对话框，显示警告信息，可点击"继续访问"或"取消"。
4. 成功登录后跳转到对应页面。

#### 第三方登录

* **支付宝**：跳转至支付宝授权页，授权后回跳。
* **QQ**：跳转至 QQ 授权页，授权后回跳。

#### 其他链接

* 右上角"忘记密码？"链接到 `/forgot-password`。
* 底部"还没有账户？立即注册"链接到 `/register`。

#### 支付宝错误处理

URL 中携带 `?error=xxx&msg=xxx` 时显示对应错误：

* `alipay_state` 支付宝登录验证失败，请重试
* `alipay_code_missing` 支付宝授权码缺失
* `alipay_config_missing` 支付宝配置缺失，请联系管理员
* `alipay_sdk_init` / `alipay_token` / `alipay_user_id_missing` 等配置或网络错误

### 2.3 忘记密码（`/forgot-password`）

#### 重置流程

1. 输入注册邮箱 → 点击"获取"按钮 → **弹出滑块验证码**（首次）或直接发送（已验证）。
2. 发送成功后页面展开动画显示：
   * 6 位 OTP 验证码输入框
   * 新密码输入框（至少 8 位）
3. 输入验证码和新密码 → 点击"重置密码"。
4. 系统先验证邮箱验证码，再调 `POST /api/auth/reset-password` 更新密码。
5. 成功后可点击"返回登录"跳回 `/login`。

### 2.4 退出登录

* 路径：用户头像菜单 → 退出登录
* 调 `POST /api/auth/logout`，清除会话后跳回登录页。

***

## 3. AI 助手（核心）

> 路径：`/ai-assistant`&#x20;
>
> 用途：与 AI 助手"莓小智"对话，实现自然语言交互、设备控制、知识问答、报告生成等。

### 3.1 界面布局

###

![](/uploads/docs/stravision-用户层操作手册/attachment/7.webp)

### 3.2 左侧导航

| **区域** | **功能**                     |
| ------ | -------------------------- |
| 新建对话   | 点击"+"图标创建新会话               |
| 对话历史   | 列表展示过往会话，按时间倒序排列，支持搜索      |
| 智能体切换  | 切换不同 AI 助手（如"莓小智"、"农业专家"等） |
| 我的空间   | 报告/收藏                      |
| 定时任务   | 侧拉面板展示所有定时任务               |
| 知识库    | 侧拉面板展示用户订阅的知识库             |
| 折叠按钮   | 收起/展开左侧栏                   |

### 3.3 对话区

#### 智能提示词（Smart Prompts）

![](/uploads/docs/stravision-用户层操作手册/attachment/8.webp)

进入会话时显示 4 个气泡提示词（如"今天环境怎么样？""帮我打开水泵""推荐种植方案"等），点击后自动填入输入框。

#### 消息类型

| **类型**  | **说明**                             |
| ------- | ---------------------------------- |
| 用户消息    | 右对齐，蓝色气泡                           |
| 助手消息    | 左对齐，支持 Markdown 渲染                 |
| 任务规划器   | `<TASK_LIST>` 标签，显示 AI 任务执行流程      |
| 思考过程    | `<REASONING>` 标签，可展开查看思维链          |
| 引用来源    | `<SOURCES>` 标签，显示参考来源卡片            |
| 工具调用    | `<TOOL_USED>` 标签，显示 MCP 工具调用过程     |
| 设备状态    | `<DEVICE_BENTO>` 标签，环境数据卡片         |
| 设备控制    | `<CONTROL_BENTO>` 标签，设备控制面板        |
| 监控画面    | `<MONITOR>` 标签，摄像头实时画面             |
| 定时任务    | `<SCHEDULED_TASKS>` 标签，定时任务管理      |
| 数据图表    | `<CHART>` 标签，ECharts/Vega-Lite 可视化 |
| 光谱数据    | `<SPECTRAL>` 标签，光谱分析卡片             |
| HTML 预览 | HTML Preview 标签，代码实时预览             |
| 网页预览    | `<WEB_PREVIEW>` 标签，网页内容            |
| 定时任务创建  | `<SCHEDULE_TASK>` 标签，AI 创建的定时任务    |
| 设备控制指令  | JSON Control 标签，AI 输出的控制 JSON      |
| AI 视觉巡检 | `move_camera_and_look` 标签，AI 调用摄像头 |

#### 消息操作

![](/uploads/docs/stravision-用户层操作手册/attachment/9.webp)

每条消息支持：

* **复制**：复制 Markdown 原文到剪贴板
* **重新生成**：让 AI 重新回答
* **删除**：删除该条消息
* **语音播放**：TTS 朗读
* **下载 PDF**：导出当前会话为 PDF
* **点赞/点踩**：反馈质量（部分版本）

### 3.4 输入区

![](/uploads/docs/stravision-用户层操作手册/attachment/10.webp)

#### 附件

* **文件上传**：点击 📎 选择文件，支持 .txt/.md/.pdf/.docx/.xlsx/.pptx/.json/.csv/.html/.xml + 图片/音频/视频
* **图片上传**：点击 🖼️ 选择图片，自动上传到服务器
* **粘贴上传**：直接 Ctrl+V 粘贴图片或文件
* **拖拽上传**：拖到输入区即可

#### 发送消息

* 快捷键：Enter 发送、Shift+Enter 换行
* 发送后立即显示用户消息，AI 助手以**流式响应**方式逐步输出（打字机效果）
* 响应过程中可点击"停止"按钮中断

### 3.5 AI 助手能力

![](/uploads/docs/stravision-用户层操作手册/attachment/11.webp)

| **能力**     | **触发方式**            | **标签**                 |
| ---------- | ------------------- | ---------------------- |
| 自然语言对话     | 直接对话                | —                      |
| 设备控制       | 语音指令"打开水泵"          | JSON Control           |
| 设备状态查询     | "当前环境怎么样？"          | `<DEVICE_BENTO>`       |
| 摄像头巡检      | "看一下草莓长势"           | `move_camera_and_look` |
| 知识库问答      | @知识库:xxx 或"什么是灰霉病？" | `<SOURCES>`            |
| 定时任务创建     | "每6小时提醒浇水"          | `<SCHEDULE_TASK>`      |
| 报告生成       | "生成本月报告"            | —                      |
| Mermaid 图表 | "画一个架构图"            | —                      |
| 数据图表       | "展示一周的温度趋势"         | `<CHART>`              |
| HTML 预览    | "写一个 HTML 计算器"      | HTML Preview           |
| 网页抓取预览     | 抓取 URL 后展示          | `<WEB_PREVIEW>`        |

​

### 3.6 报告系统

* AI 生成的长报告可保存到"我的空间"（My Space）
* 支持查看历史报告、导出 PDF
* 报告以卡片列表展示

![](/uploads/docs/stravision-用户层操作手册/attachment/12.webp)

***

## 4. 仪表板（Dashboard）

> 路径：`/dashboard`
>
> 用途：可个性化定制的温室环境数据面板。底层基于 `react-grid-layout` 实现拖拽/调整大小，组件数据通过 SSE 实时推送。

### 4.1 界面布局

![](/uploads/docs/stravision-用户层操作手册/attachment/13.webp)

### 4.2 顶部 PageHeader 操作

![](/uploads/docs/stravision-用户层操作手册/attachment/14.webp)

| **元素**    | **行为**                       |
| --------- | ---------------------------- |
| Logo + 标题 | 点击返回首页                       |
| 搜索框       | 过滤组件标题（focus 时宽度从 160 变 200） |
| 布局切换下拉    | 选择 6 套预设布局（见 4.5）            |
| 编辑下拉      | 添加组件 / 进入编辑模式 / 恢复默认         |
| 完成按钮      | 编辑模式下出现，点击保存布局到 localStorage |
| 适老模式图标    | 切换大字体/大按钮显示                  |

​

### 4.3 全部 Widget 详解

![](/uploads/docs/stravision-用户层操作手册/attachment/15.webp)

| **Widget**              | **数据来源**                     | **关键交互**                         |
| ----------------------- | ---------------------------- | -------------------------------- |
| **TemperatureWidget**   | SSE `deviceData.temperature` | 显示大数字 + 单位℃ + 趋势指示（↑/↓/稳定）+ 迷你折线 |
| **HumidityWidget**      | SSE `deviceData.humidity`    | %RH 大数字 + 趋势                     |
| **LightWidget**         | SSE `deviceData.light`       | lux 大数字 + 趋势                     |
| **CO2Widget**           | SSE `deviceData.co2`         | ppm 大数字（默认 400）+ 趋势              |
| **SoilWidget**          | SSE `deviceData.soil_*`      | 土壤湿度+温度双指标                       |
| **NutrientsWidget**     | SSE `deviceData.n_p_k`       | N/P/K 三指标                        |
| **WeatherWidget**       | WeatherContext               | 当地天气图标 + 温湿度                     |
| **AIInsightWidget**     | `/api/ai/insight`            | AI 生成的当前环境建议，渐变背景                |
| **ChartWidget**         | `/api/device-history`        | ECharts 折线图，时间范围 1h/24h/7d/30d   |
| **SpectrumWidget**      | `/api/spectrum`              | 光谱频谱图                            |
| **MembershipCard**      | user.membership              | 等级+剩余 AI 额度+升级按钮                 |
| **QuickControlsWidget** | 用户授权设备                       | 一键开关 4 个继电器                      |
| **DailyBriefingIsland** | AI 每日简报                      | 顶部悬浮动态岛                          |

> 所有 Widget 在编辑模式下右上角出现"✕"关闭按钮。

### 4.4 6 套预设布局

![](/uploads/docs/stravision-用户层操作手册/attachment/16.webp)

| **布局名**           | **说明**        |
| ----------------- | ------------- |
| 默认视图（default）     | 12 列均分，适合通用场景 |
| 紧凑视图（compact）     | 组件更小，每行容纳更多   |
| 数据优先（dataFirst）   | 大图表 + 顶部传感器条  |
| 监控大屏（monitor）     | 双摄像头画面 + 关键指标 |
| 环境监测（environment） | 温湿度/CO2/光照优先  |
| 土壤监测（soil）        | 土壤/营养/光谱优先    |

### 4.5 编辑模式操作流程

![](/uploads/docs/stravision-用户层操作手册/attachment/17.webp)

1. 点击右上角"编辑"图标 → 下拉菜单选择"编辑布局"。
2. 进入编辑模式：

![](/uploads/docs/stravision-用户层操作手册/attachment/18.webp)

* 所有 Widget 右上角出现"✕"关闭按钮。
* Widget 可拖拽（鼠标按住标题区）。

![](/uploads/docs/stravision-用户层操作手册/attachment/19.webp)

* Widget 右下角出现调整大小手柄。

![](/uploads/docs/stravision-用户层操作手册/attachment/20.webp)

3. 长按或右键 Widget 弹出上下文菜单：

![](/uploads/docs/stravision-用户层操作手册/attachment/21.webp)

* 移除组件
* 调整大小（小/中/大）
* 添加组件：点击"编辑"图标 → "添加组件" → 弹出 WidgetLibrary 对话框。
* 点击右上角"完成"按钮 → 保存到 localStorage：
  * `dashboard-layout`：布局数组 `[{i, x, y, w, h}, ...]`
  * `dashboard-layout-preset`：当前预设名
* 取消编辑：再次点击"编辑" → 退出，原布局保留。

### 4.6 WidgetLibrary 对话框

![](/uploads/docs/stravision-用户层操作手册/attachment/22.webp)

打开后展示全部可用组件（图标 + 名称 + 描述），点击选择后弹出尺寸选择：

* 小（2×2）
* 中（4×2）
* 大（4×4 或 6×4）

确认后自动插入到 GridLayout 最底部位置。

### 4.7 实时数据机制

* **SSE 连接**：默认通过 EventSource 订阅 `/api/device/stream`（或 WebSocket），组件数据实时更新。
* **状态点指示**：
  * 绿色：SSE 已连接
  * 黄色：连接中/重连
  * 红色：断开（点击尝试重连）
* **数据历史**：仅 `ChartWidget` 调 `/api/device-history` 拉取历史数据，按时间范围参数 `range=1h|24h|7d|30d`。
* **降级**：SSE 断开时 Widget 显示 "--" 或最后已知值，不报错。

### ~~4.8 键盘快捷键~~

| **~~快捷键~~**   | **~~功能~~**           |
| ------------- | -------------------- |
| ~~Esc~~       | ~~退出编辑模式~~           |
| ~~鼠标滚轮~~      | ~~编辑模式下不缩放，普通模式无~~   |
| ~~双击 Widget~~ | ~~部分 Widget 支持全屏查看~~ |

### 4.9 适老模式

* 右上角老人图标切换
* 开启后：根字号 18px、按钮高度加大、对比度提升
* 状态保存到 localStorage（`elderly-mode`）

***

## 5. 实时监控（Monitor）

![](/uploads/docs/stravision-用户层操作手册/attachment/23.webp)

> 路径：`/monitor`
>
> 用途：温室摄像头实时画面、环境设备控制、AI 每日简报动态岛。包含 3 个版本（`monitor-beautiful.tsx` 默认 + `monitor-full-client.tsx` + `monitor-ugly.tsx`），通过页面开关切换。

### 5.1 三大版本说明

| **版本**  | **文件**                    | **风格**             | **何时使用** |
| ------- | ------------------------- | ------------------ | -------- |
| 美丽版（默认） | `monitor-beautiful.tsx`   | 玻璃拟态 + 渐变背景 + 圆润卡片 | 推荐使用     |
| 完整版     | `monitor-full-client.tsx` | 经典版式，完整功能          | 功能完整     |
| 极简版     | `monitor-ugly.tsx`        | 紧凑布局               | 兼容旧浏览器   |

### 5.2 整体布局（美丽版）

![](/uploads/docs/stravision-用户层操作手册/attachment/24.webp)

### ~~5.3 顶部 DailyBriefingIsland（每日简报动态岛）~~

* ~~位置：顶部中央悬浮~~
* ~~显示内容：用户名 + 当前环境简报~~
* ~~触发条件：登录后自动加载~~
* ~~交互：可展开看详细简报、收起、关闭~~

### 5.4 监控设备区（左侧栏）

#### 摄像头列表

![](/uploads/docs/stravision-用户层操作手册/attachment/25.webp)

每个摄像头显示为圆角卡片：

* 48px 图标（PlayCircle 直播中 / Video 离线）
* 摄像头名称（加粗）
* 状态点（绿=Live / 灰=Offline）
* 当前时间（等宽字体）
* **点击卡片**：打开摄像头详情模态框

![](/uploads/docs/stravision-用户层操作手册/attachment/26.webp)

**摄像头数据来源**：

* 优先从 `localStorage.monitor-cameras` 读取
* 默认配置：2 个摄像头（A=前视，B=后视）

![](/uploads/docs/stravision-用户层操作手册/attachment/27.webp)

**摄像头配置弹窗字段**（`handleCameraSettingsSave`）：

| **字段**       | **类型** | **说明**               |
| ------------ | ------ | -------------------- |
| name         | Input  | 摄像头显示名               |
| url          | Input  | 流地址（RTMP/HLS/WebRTC） |
| time         | Input  | 时间戳叠加配置              |
| username     | Input  | 认证用户名（如有）            |
| password     | Input  | 认证密码                 |
| stunUrl      | Input  | WebRTC STUN 服务器      |
| stunUsername | Input  | STUN 用户名             |
| stunPassword | Input  | STUN 密码              |

保存后写入 localStorage。

#### 环境设备列表

![](/uploads/docs/stravision-用户层操作手册/attachment/28.webp)

可添加的设备（`AVAILABLE_DEVICES`）：

* 温湿度传感器
* 土壤传感器
* 光照传感器
* CO2 传感器
* 继电器（4 个）
* LED（4 个）
* 步进电机

每个设备卡片显示：

* 设备图标 + 名称
* 实时数值（如温度 24.5℃）
* 电池电量（70-100% 随机）
* 移除按钮

操作：点击"+"添加设备、点击"×"移除设备。

### 5.5 摄像头详情模态框（点击摄像头卡片触发）

打开后进入全屏视频播放界面：

![](/uploads/docs/stravision-用户层操作手册/attachment/29.webp)

#### 顶部控制条

* 摄像头名称 + 关闭按钮（×）
* 缩放控制：1x \~ 3x（ZoomIn/ZoomOut 按钮）
* 录制按钮（Toggle 状态）
* 截图按钮
* 全屏按钮

#### 视频区

* 主流画面（`<video>` 标签）
* 鼠标拖拽平移（缩放后）
* 双击切换全屏

#### 底部 PTZ 云台控制

* 左移按钮（调用 `controlStepper(1)`）
* 右移按钮（调用 `controlStepper(2)`）
* 停止/重置按钮（调用 `controlStepper(0)`）
* 注：当前仅支持水平方向（左右移动），上下方向暂不支持

#### 关键交互逻辑

```typescript
handlePTZ("left")  → controlStepper(1) → toast "云台左移指令已发送"
handlePTZ("right") → controlStepper(2) → toast "云台右移指令已发送"
handlePTZ("up" | "down" | "reset") → controlStepper(0) → toast "云台已停止"
```

#### 截图保存

```typescript
const canvas = document.createElement('canvas')
canvas.width = video.videoWidth
canvas.height = video.videoHeight
ctx.drawImage(video, 0, 0)
const dataUrl = canvas.toDataURL('image/png')
// 下载为 snapshot-{name}-{timestamp}.png
```

#### 录像功能

* 切换"录制"按钮 → 显示"开始录像"提示
* 再次点击 → 切换"录像已保存"提示
* 实际录像文件保存逻辑由 video 元素和 MediaRecorder 配合

### 5.6 中部传感器实时卡片

![](/uploads/docs/stravision-用户层操作手册/attachment/30.webp)

显示当前设备传感器数据（来自 SSE/上下文）：

| **卡片** | **数据**                   | **显示**       |
| ------ | ------------------------ | ------------ |
| 温度     | `deviceData.temperature` | 数字 + 单位 + 趋势 |
| 湿度     | `deviceData.humidity`    | 同上           |
| 光照     | `deviceData.light`       | 同上           |
| CO2    | `deviceData.co2`         | 同上           |
| 土壤     | 土壤湿度/温度                  | 双指标          |
| pH     | pH 值                     | 数字 + 适宜范围指示  |

### 5.7 继电器控制（中部快速控制）

![](/uploads/docs/stravision-用户层操作手册/attachment/31.webp)

每个继电器（relay5/6/7/8）显示为一行：

* 设备图标 + 名称（水泵/风扇/补光灯×2）
* 状态点（绿=on / 灰=off）
* MiniToggle 小开关
* 锁定图标（点击锁定后禁用此设备的语音/AI 控制）

操作：

* 点击开关 → `toggleRelay(num, currentState)` → 立即发送 `POST /api/device/relay`
* 锁定按钮 → 设置 `lockedControls[num] = true` → 禁止 AI/语音再控制

### 5.8 完整版（`monitor-full-client.tsx`）附加功能

* 设备详情查看
* 自动化规则状态显示
* 完整操作日志
* 摄像头分组管理

### 5.9 配置来源

* **摄像头 URL**：管理员在后台"系统设置 → 监控摄像头配置"配置
* **环境设备**：用户自管理（localStorage 持久化）
* **设备权限**：`useUser()` Hook 返回的 `user.devicePermissions`

### 5.10 移动端差异

* 移动端访问 `/monitor` 自动重定向到 `/home`（移动端布局）
* 移动端仅显示一个全屏视频
* 摄像头控制按钮位置自适应

### 5.11 关键 API

| **操作** | **接口**                                         |   |      |
| ------ | ---------------------------------------------- | - | ---- |
| 加载摄像头  | `GET /api/greenhouse/cameras`                  |   |      |
| 继电器控制  | `POST /api/device/relay` body `{relay, state}` |   |      |
| 步进电机控制 | `POST /api/device/stepper` body \`\{action: 0  | 1 | 2}\` |
| 设备状态   | SSE `GET /api/device/stream`                   |   |      |

***

## 6. 设备控制（Device Control）

![](/uploads/docs/stravision-用户层操作手册/attachment/32.webp)

> 路径：`/device-control`
>
> 用途：通过 Web 界面远程控制温室设备（继电器、LED、步进电机、摄像头云台）。底层通过 `useDeviceControl` Hook 统一管理设备状态。

### 6.1 设备类型总览

| **设备 ID** | **名称**      | **控制项**        | **权限字段**                        |
| --------- | ----------- | -------------- | ------------------------------- |
| relay5    | 水泵          | 开关             | `user.devicePermissions.relay5` |
| relay6    | 风扇          | 开关             | `relay6`                        |
| relay7    | 植物全光谱补光灯    | 开关             | `relay7`                        |
| relay8    | 光照植物补光灯     | 开关             | `relay8`                        |
| led1      | LED 红光      | 0-255 亮度       | `led1`                          |
| led2      | LED 绿光      | 0-255 亮度       | `led2`                          |
| led3      | LED 蓝光      | 0-255 亮度       | `led3`                          |
| led4      | LED 白光      | 0-255 亮度       | `led4`                          |
| stepper   | 丝杆滑台（摄像头云台） | 方向移动 + 归位 + 拍照 | `stepper`                       |

### 6.2 页面整体布局

![](/uploads/docs/stravision-用户层操作手册/attachment/33.webp)

### 6.3 继电器控制

#### 卡片字段

每个继电器一张卡片（`relay5/6/7/8`）：

| **元素**    | **说明**                         |
| --------- | ------------------------------ |
| 设备图标      | 蓝色图标（水泵、风扇、补光灯×2）              |
| 设备名称      | "水泵 / 风扇 / 植物全光谱补光灯 / 光照植物补光灯" |
| 当前状态      | 绿色徽章"开启中" / 灰色徽章"已关闭"          |
| 大型 Switch | 点击切换状态                         |
| 锁定按钮      | 锁定后此设备不受 AI/语音控制（带锁图标）         |
| 权限提示      | 无权限时显示"无权限"灰底                  |

#### 切换流程

1. 用户点击 Switch 开关。
2. 前端检查 `lockedControls[relay]`：
   * 若已锁定：toast 提示"设备已锁定，请先解锁"
   * 若未锁定：继续
3. 调用 `toggleRelay(num, currentState)`：
   * 发送 `POST /api/device/relay` body `{ relay: 'relay5' | 'relay6' | 'relay7' | 'relay8', state: 0|1 }`
   * 收到响应后更新本地 deviceData
4. 切换中显示 loading 状态。
5. 失败时显示错误 toast（如 403 权限不足）。

#### 锁定操作

```typescript
toggleLock = (relay: number, e) => {
  e.stopPropagation()
  setLockedControls(prev => ({ ...prev, [relay]: !prev[relay] }))
}
```

* 锁定状态保存在 `useState` 中（页面刷新后重置）
* 锁定后该设备的 `handleToggle` 立即 return

### 6.4 LED 调光

#### 4 条 LED 控制条（红/绿/蓝/白）

每条 LED 显示：

* 颜色预览方块（实际显示该 LED 颜色）
* LED 名称 + 颜色标签（红/绿/蓝/白）
* 滑动条（0-255 步进，可拖动）
* 实时数值显示
* "关闭"按钮（一键归零）

#### 控制逻辑

```typescript
setLEDs = (r, g, b, w) => {
  // 0-255 范围
  // 实时同步到硬件（拖动时持续发送）
  // 防抖 100ms
}
```

* 拖动滑动条时实时更新（防抖后批量发送）
* 接口：`POST /api/device/led` body `{ led: 'led1'|'led2'|'led3'|'led4', brightness: 0-255 }`
* 权限：必须拥有对应 `led1`/`led2`/`led3`/`led4` 权限

#### RGB 联动（语音/AI 场景）

收到 `set_led` 指令时（带 r/g/b 参数）：

* r → led1（红）
* g → led2（绿）
* b → led3（蓝）
* led4（白）不变

### 6.5 步进电机（云台）控制

#### 位置显示

* 大字显示当前 X、Y 坐标
* 单位：脉冲数（step）
* 范围：通常 0-1000

#### 8 方向控制

按钮布局（典型为 3×3 网格）：

![](/uploads/docs/stravision-用户层操作手册/attachment/34.webp)

每个方向按钮：

* 鼠标按住：持续发送移动指令
* 释放：自动发送停止指令
* 移动中显示加载动画

#### 步长调节

* 默认步长 100 步/次
* 可在输入框调整（10-500 步）
* 步长越大移动越远

#### 归位按钮

* 点击"归位" → 调用 `controlStepper(0)` → 回到原点 (0, 0)
* 配合 toast 反馈"云台已归位"

#### 拍照按钮

* 仅当摄像头在线时可用
* 点击 → 触发当前摄像头抓拍
* 调 `POST /api/device/stepper/snapshot`
* 抓拍图片保存到"我的空间"或下载到本地

### 6.6 摄像头云台联动

#### 4 方向快捷按钮

独立于步进电机的 4 个方向按钮：

* 左（Left） → `controlStepper(1)`
* 右（Right） → `controlStepper(2)`
* 上/下/复位 → `controlStepper(0)`（停止）

#### 联动场景

* AI 视觉巡检时 AI 可调用此接口
* 用户在监控页面（`/monitor`）也可使用同样的 PTZ 控制
* 步进电机位置变化时实时同步到所有视图

### 6.7 操作日志

#### 列表字段

| **列名** | **数据**                 |
| ------ | ---------------------- |
| 时间     | 格式 yyyy-MM-dd HH:mm:ss |
| 设备     | relay5/led1/stepper 等  |
| 操作     | 开启/关闭/调光/移动            |
| 操作者    | 用户名                    |
| 参数     | 具体数值（如"亮度=128"）        |
| 结果     | 成功/失败                  |

#### 接口

`GET /api/device/logs?limit=50&device=relay5`

#### 实时刷新

* 每 5 秒自动刷新
* 顶部有"刷新"按钮手动刷新
* 可按设备类型筛选

### 6.8 权限不足提示

#### 显示规则

* 未授权设备：卡片置灰，显示"无权限"水印
* 后端返回 403：弹出 toast"权限不足，请联系管理员"
* 已锁定设备：开关禁用，hover 显示"已锁定"提示

#### 申请权限

* 管理员可在后台"用户管理"分配权限
* 设备权限字段：`relay5`、`relay6`、`relay7`、`relay8`、`led1`-`led4`、`stepper`
* 权限变更后用户需刷新页面生效

### 6.9 关键 Hook 与 API

#### useDeviceControl Hook

```typescript
const {
  deviceData,         // 实时设备状态
  isConnected,        // SSE 连接状态
  toggleRelay,        // 切换继电器
  setLEDs,            // 设置 LED 亮度
  controlStepper,     // 控制步进电机
  lockControl,        // 锁定/解锁设备
  unlockedControls,   // 未锁定设备
} = useDeviceControl()
```

#### 关键 API

| **操作** | **方法** | **端点**                         |
| ------ | ------ | ------------------------------ |
| 继电器控制  | POST   | `/api/device/relay`            |
| LED 控制 | POST   | `/api/device/led`              |
| 步进电机   | POST   | `/api/device/stepper`          |
| 拍照     | POST   | `/api/device/stepper/snapshot` |
| 操作日志   | GET    | `/api/device/logs?limit=50`    |
| 实时数据   | SSE    | `/api/device/stream`           |

***

## 7. 自动化策略（Automation）

> 路径：`/automation`（列表页）+ `/automation/editor`（图形化编辑器）
>
> 用途：通过图形化拖拽方式创建"如果 A 发生，那么执行 B"的自动化规则。底层基于 `@xyflow/react`（ReactFlow）。
>
> 核心能力：VLM 视觉识别 + 传感器阈值 + 逻辑判断 + 设备控制 + AI 推理 + 通知。

### 7.1 自动化列表（`/automation`）

#### 7.1.1 整体布局

![](/uploads/docs/stravision-用户层操作手册/attachment/35.webp)

#### 7.1.2 顶部 PageHeader

| **元素** | **行为**                           |
| ------ | -------------------------------- |
| Logo   | 点击返回首页                           |
| 搜索框    | 实时过滤规则名/描述（focus 时宽度从 160 变 200） |
| 用户菜单   | 头像下拉，含设置/退出                      |

#### 7.1.3 筛选胶囊

3 个胶囊按钮（圆角药丸）：

| **胶囊** | **颜色**     | **显示数量**                                               |
| ------ | ---------- | ------------------------------------------------------ |
| 全部     | 白色         | `rules.length`                                         |
| 运行中    | 绿色点 + 绿字   | `activeCount = rules.filter(r => r.is_active).length`  |
| 已暂停    | 琥珀色点 + 琥珀字 | `pausedCount = rules.filter(r => !r.is_active).length` |

点击切换筛选状态，规则卡片实时过滤。

#### 7.1.4 规则卡片（每张卡片结构）

![](/uploads/docs/stravision-用户层操作手册/attachment/36.webp)

**卡片元素详解**：

| **元素** | **数据源**                       | **显示**                           |
| ------ | ----------------------------- | -------------------------------- |
| 状态条    | `rule.is_active`              | 顶部 1px 渐变线（绿=运行/灰=暂停）            |
| 图标     | `rule.trigger_type === 'vlm'` | `<Wand2>`（魔法棒），否则 `<Zap>`（闪电）    |
| 徽章     | `rule.is_active`              | "运行中"（绿边框）/ "已暂停"（灰边框）           |
| 名称     | `rule.name`                   | 18px 加粗，hover 变绿                 |
| 描述     | `rule.description`            | 2 行 line-clamp，无描述时显示"暂无描述"      |
| 触发次数   | `rule.execution_count`        | 等宽字体 + 闪电小图标                     |
| 上次运行   | `rule.last_triggered_at`      | 格式 `HH:MM:SS`，无则显示 `--:--`       |
| 编辑按钮   | —                             | 链接到 `/automation/editor?id={id}` |
| 菜单（⋮）  | —                             | 弹出"立即运行"（开发中） + "删除规则"           |

**特殊样式**：

* 运行中卡片：绿色光晕 `shadow-green-500/5`
* 已暂停卡片：50% 灰度 + 80% 透明度，hover 时恢复

#### 7.1.5 空状态

当没有匹配的规则时：

* 大号漏斗图标（灰色）
* "没有找到规则"标题
* 提示文字
* 若无搜索词：显示"\[+ 创建新规则]"按钮

#### 7.1.6 关键操作

| **操作** | **接口**                                | **说明**                                 |
| ------ | ------------------------------------- | -------------------------------------- |
| 加载列表   | `GET /api/automation/rules`           | 返回 `{success, data: AutomationRule[]}` |
| 删除规则   | `DELETE /api/automation/rules/{id}`   | 直接删除（无确认弹窗）                            |
| 进入编辑   | `Link` 到 `/automation/editor?id={id}` | 客户端路由跳转                                |

#### 7.1.7 AutomationRule 数据结构

```typescript
interface AutomationRule {
  id: string
  name: string
  description?: string
  is_active: boolean       // true=运行中, false=已暂停
  trigger_type: 'vlm' | 'sensor' | 'schedule' | 'manual'
  execution_count: number  // 累计触发次数
  last_triggered_at?: string  // ISO 时间戳
  nodes: any[]             // ReactFlow 节点
  edges: any[]             // ReactFlow 连线
  created_at: string
  updated_at: string
}
```

### 7.2 自动化编辑器（`/automation/editor`）

#### 7.2.1 整体布局

![](/uploads/docs/stravision-用户层操作手册/attachment/37.webp)

#### 7.2.2 顶部工具栏

| **元素**    | **行为**                             |
| --------- | ---------------------------------- |
| 返回箭头      | 返回 `/automation` 列表                |
| 策略名 Input | 内联编辑（默认"新自动化策略"）                   |
| AI 生成按钮   | 打开 AI 智能生成对话框                      |
| 麦克风按钮     | 语音输入策略需求（VAD）                      |
| 扬声器按钮     | TTS 朗读当前节点说明                       |
| 模拟运行按钮    | 不真实执行，仅模拟流程                        |
| 保存按钮      | 调 `POST/PUT /api/automation/rules` |

#### 7.2.3 左侧节点库

![](/uploads/docs/stravision-用户层操作手册/attachment/38.webp)

按 4 大类组织（`NODE_TYPES`）：

| **分类**               | **节点类型**                         | **说明** |
| -------------------- | -------------------------------- | ------ |
| **触发器**（triggerNode） | 传感器阈值、时间计划、VLM 视觉识别、手动触发、设备状态变化  | 流程起点   |
| **逻辑**（logicNode）    | 数值比较、范围判断、与/或/非、时间窗口             | 中间判断   |
| **AI**（aiNode）       | LLM 推理、视觉诊断、趋势预测、推荐生成            | 智能分析   |
| **动作**（actionNode）   | 开关设备、调光、移动云台、发送通知、HTTP POST、控制设备 | 流程终点   |

每个节点分类可折叠/展开，节点卡片支持拖拽到画布。

#### 7.2.4 4 类节点详解

**触发器节点（triggerNode）**

| **子类型**  | **配置字段**                               |
| -------- | -------------------------------------- |
| 传感器阈值    | 传感器类型（温度/湿度/光照/CO2/土壤）、运算符、阈值、持续时间（防抖） |
| 时间计划     | 模式（每天/每周/每月/一次性/cron）、时间               |
| VLM 视觉识别 | 摄像头选择、识别目标（如"灰霉病"）、置信度阈值               |
| 设备状态变化   | 目标设备、新状态                               |
| 手动触发     | 仅触发名称                                  |

**逻辑节点（logicNode）**

| **子类型** | **配置字段**     |
| ------- | ------------ |
| 数值比较    | 运算符、参考值、持续时间 |
| 范围判断    | 最小值、最大值      |
| 组合条件    | 与/或/非 + 子条件  |
| 时间窗口    | 开始时间、结束时间    |
| 概率判断    | 百分比（用于随机采样）  |

**AI 节点（aiNode）**

| **子类型** | **配置字段**                     |
| ------- | ---------------------------- |
| LLM 推理  | 提示词模板、关联上下文（环境数据/历史日志/摄像头画面） |
| 视觉诊断    | 摄像头选择、识别目标、置信度阈值             |
| 趋势预测    | 历史数据范围、预测时长                  |
| 推荐生成    | 推荐类型（施肥/浇水/通风）、约束条件          |

**动作节点（actionNode）**

| **子类型**   | **配置字段**                     |
| --------- | ---------------------------- |
| 开关设备      | 设备（relay5/6/7/8/led1-4）、目标状态 |
| 调光        | 设备、亮度（0-255）                 |
| 移动云台      | 方向/坐标、步长                     |
| 发送通知      | 渠道（APP/邮件/短信）、标题、内容、收件人      |
| HTTP POST | URL、Headers、Body             |
| 调用 AI     | 提示词、上下文                      |
| 延时        | 延时秒数                         |
| 循环        | 次数、间隔                        |

#### 7.2.5 画布操作（ReactFlow）

* **拖拽节点**：从左侧节点库拖到画布
* **连线**：从节点右下角 handle 拖到另一节点左上角
* **删除节点**：选中后按 Delete 键
* **缩放**：鼠标滚轮
* **平移**：拖拽空白处
* **多选**：框选或 Ctrl+点击

#### 7.2.6 节点智能归类（inferNodeType）

编辑器能根据节点 label/subType 文本智能推断类型（当 type 字段缺失时）：

```typescript
// 包含 AI/LLM/诊断/分析/识别 → aiNode
// 包含 控制/开关/通知/发送 → actionNode
// 包含 传感/定时/阈值/温度/湿度 → triggerNode
// 包含 判断/比较/范围/且/或 → logicNode
```

#### 7.2.7 AI 智能生成策略

点击顶部"AI 生成"按钮（魔法棒图标）：

1. 弹出输入框（自然语言描述）
2. 用户输入需求，如：

> "当温度超过 30 度时打开风扇，低于 25 度时关闭"

3. 调 `POST /api/automation/ai-generate` 返回节点和连线 JSON
4. 自动填充到画布
5. toast 提示"已加载 AI 生成的策略"

**安全机制**：

* 后端返回的节点会自动 `sanitizeNodes` 规范化
* 自动布局（3 列网格，间距 320x220）
* 未知 type 字段会被智能归类

**从 AI 助手跳转**：

* 路径 `/automation/editor?from=ai-assistant`
* 自动从 `sessionStorage.temp_automation_strategy` 读取
* 默认名称"由 AI 助手生成的自动化策略"
* 读取后清除 sessionStorage

#### 7.2.8 模拟运行

点击"模拟运行"按钮：

* 不真实执行任何设备控制
* 沿节点-连线拓扑遍历
* 在每个节点暂停 1 秒模拟执行
* 显示执行轨迹日志（哪个节点触发、下一步去哪里）
* 高亮当前执行节点

#### 7.2.9 语音控制

* 麦克风按钮启用 VAD（语音活动检测）
* 实时识别用户语音转文字
* 文字自动填入 AI 生成输入框
* 扬声器按钮 TTS 朗读当前节点说明

#### 7.2.10 右侧设备列表面板（可折叠 Sheet）

* 通过右下角按钮打开
* 显示所有可控制设备
* 拖拽设备到画布可快速创建动作节点

#### 7.2.11 保存策略

| **操作** | **接口**                                                                           |
| ------ | -------------------------------------------------------------------------------- |
| 新建     | `POST /api/automation/rules` body `{name, nodes, edges, description, is_active}` |
| 更新     | `PUT /api/automation/rules/{id}` body 同上                                         |
| 草稿     | `is_active: false` 保存但不启用                                                        |
| 启用     | `is_active: true` 立即调度                                                           |

保存成功后 toast 提示"规则已保存"，跳回列表页。

### 7.3 策略执行机制

#### 7.3.1 后台调度器

* 调度器定期扫描（默认 10 秒）
* 检查每个运行中规则的触发器节点
* 满足条件时按图执行
* 失败重试 3 次

#### 7.3.2 执行记录

* 记录每次触发的：
  * 时间
  * 触发的节点 ID
  * 执行的节点链
  * 设备操作结果
  * AI 推理结果
* 可在"活动动态"页面查看
* 累计计数更新到 `execution_count`

#### 7.3.3 启用/暂停

* 列表页卡片操作菜单中可切换
* 或在编辑器中通过 `is_active` 切换
* 暂停后调度器跳过此规则

### 7.4 关键 API

| **操作** | **方法** | **端点**                                          |
| ------ | ------ | ----------------------------------------------- |
| 列表     | GET    | `/api/automation/rules`                         |
| 详情     | GET    | `/api/automation/rules/{id}`                    |
| 新建     | POST   | `/api/automation/rules`                         |
| 更新     | PUT    | `/api/automation/rules/{id}`                    |
| 删除     | DELETE | `/api/automation/rules/{id}`                    |
| AI 生成  | POST   | `/api/automation/ai-generate`                   |
| 模拟运行   | POST   | `/api/automation/simulate`                      |
| 立即运行   | POST   | `/api/automation/rules/{id}/run`                |
| 启用/暂停  | PATCH  | `/api/automation/rules/{id}` body `{is_active}` |

***

## 8. MCP 商店与我的 MCP

### 8.1 MCP 商店（`/mcp-store`）

> 用途：浏览和安装 MCP（Model Context Protocol）插件，扩展 AI 助手能力。

#### 顶部操作

* 搜索框（按名称/描述搜索）
* 分类筛选（官方推荐 / 热门 / 最新 / 类别）
* 排序（按优先级/热度/最新）

#### 插件卡片

每张卡片显示：

| **元素**  | **说明**                  |
| ------- | ----------------------- |
| 图标      | 48x40 圆角                |
| 名称 + 标识 | 中文名称 + 英文 ID            |
| 官方徽章    | 蓝色对勾表示官方认证              |
| 分类 Tag  | 如"web"、"农业"             |
| 描述      | 简短说明                    |
| 标签      | 功能标签（如"需要 API Key"）     |
| 操作      | "安装"按钮（未安装）/ "已安装"（已安装） |

#### 详情弹窗

点击卡片打开详情，显示完整描述、配置说明、所需 API Key 等。

#### 安装流程

1. 点击"安装"按钮
2. 若插件需要 API Key，弹出输入框
3. 确认后调 `POST /api/mcp/install` body `{ id, apiKey }`
4. 安装成功后插件出现在"我的 MCP"页面

### 8.2 我的 MCP（`/my-mcp`）

> 用途：管理已安装的 MCP 插件。

#### 页面布局

* 顶部导航栏（返回 MCP 商店）
* Hero 区域：当前已安装数量 + "添加自定义"按钮
* 插件网格：每张卡片显示已安装插件

#### 插件卡片

* 图标 + 名称
* 描述
* 功能标签
* **配置按钮**：编辑 API Key 等配置
* **卸载按钮**：调 `DELETE /api/mcp/install/{id}`
* **启用/禁用开关**

#### 添加自定义 MCP 服务器

* 点击"添加自定义"按钮
* 弹出对话框，填写：
  * 服务器名称
  * 启动命令（npx/uvx）
  * 参数（JSON 数组）
  * 环境变量（JSON 对象）
  * 描述
* 调 `POST /api/mcp/custom` 创建

***

## 9. 模型商店（Model Store）

> 路径：`/model-store`
>
> 用途：浏览所有 AI 提供商可用的模型，用户可查看模型能力、上下文窗口、是否支持视觉/推理/embedding。

### 9.1 顶部

* 标题"AI 模型市场"
* 副标题"共 N 个模型（M 个已启用）"

### 9.2 筛选

* 搜索框（按名称/ID/描述）
* 类型筛选：OpenAI 兼容 / 百炼 DashScope / 自定义
* 能力筛选：视觉 / 推理 / 视觉+推理 / Embedding
* 状态筛选：已启用（默认）/ 已禁用 / 全部

### 9.3 模型卡片网格

每张卡片显示：

* 模型图标
* 名称 + 状态指示
* 描述
* 能力 Tag：视觉（蓝）/ 推理（紫）/ Embedding（琥珀）
* 提供商 Tag
* 上下文窗口（如"128K"）

### 9.4 切换默认模型

* 卡片右上角有"设为默认"按钮
* 点击后调 `PUT /api/ai-providers/default-model`
* 默认模型将在 AI 助手页面顶部自动选择

***

## 10. 知识库商店（KB Store）

> 路径：`/kb-store`
>
> 用途：浏览和订阅"市场知识库"（如"草莓种植最佳实践"），订阅后可在 AI 助手对话中使用 `@知识库:xxx` 调用。

### 10.1 顶部操作

* 搜索框
* 分类筛选：农业 / 通用 / 工业 / 服务业 / 教育 / 医疗 / 金融 / 科技
* 排序：按热度/最新/官方优先

### 10.2 统计栏

* 知识库总数
* 官方发布数
* 累计订阅数

### 10.3 知识库卡片

每张卡片显示：

* 封面图（无图显示主题色块 + 书本图标）
* 名称（加粗，official 显示蓝色对勾）
* 分类 Tag
* 条目数
* 订阅数（火焰图标）
* 发布者
* 发布时间
* 状态（已发布/草稿/已下架）
* 操作：
  * **查看详情**：打开详情弹窗
  * **订阅/取消订阅**

### 10.4 详情弹窗

* 封面图
* 名称 + 分类
* 官方 Tag
* 描述
* 信息行：条目数、订阅数、发布者、发布时间

### 10.5 订阅后使用

* 订阅的知识库会出现在 AI 助手的"知识库"侧拉面板
* 对话中可通过 `@知识库:xxx` 引用：
  * 例：`@知识库:草莓种植 灰霉病如何防治？`
* AI 会检索该知识库中的相关条目作为参考

### 10.6 我的订阅

* 在个人中心或 AI 助手"知识库"面板查看已订阅列表
* 可取消订阅
* 自动同步后台条目（新增条目下次对话即可使用）

***

## 11. 个人中心（Profile）

> 路径：`/profile`
>
> 用途：查看和编辑个人信息、会员信息、设备权限、活动记录等。

### 11.1 顶部信息

* 大头像 + 用户名
* 角色徽章（普通/会员/管理员/超管）
* 会员等级（free/pro/plus）
* 加入时间
* 退出登录按钮

### 11.2 Tabs

| **Tab** | **内容**             |
| ------- | ------------------ |
| 概览      | 账号信息、会员信息、最近活动、统计  |
| 设备      | 已授权设备列表 + 设备状态     |
| 设置      | 跳转到 `/settings` 页面 |
| 活动      | 最近活动动态             |
| 通知      | 通知偏好设置             |

### 11.3 概览 Tab

* **账号信息卡**：头像、用户名、邮箱、注册时间、最后登录
* **会员信息卡**：当前等级、每日 AI 限额、已使用次数、额外余额、升级按钮
* **统计卡**：对话次数、消息数、设备控制次数、自动化触发次数
* **最近活动**：最近 5 条活动

### 11.4 设备 Tab

* 显示当前用户被授权的设备：
  * 继电器：水泵/风扇/补光灯（✓/✗）
  * LED：红/绿/蓝/白（✓/✗）
  * 步进电机（✓/✗）
* 每个设备有"去控制"按钮跳转到 `/device-control`

### 11.5 设置 Tab

* 跳转到 `/settings` 页面

### 11.6 活动 Tab

* 显示用户所有活动记录（操作、消息、设备控制等）
* 调 `GET /api/activity?userId={id}&limit=50`

### 11.7 通知 Tab

* 开关设置哪些事件需要 APP 推送/邮件通知
* 调 `PATCH /api/users/{id}/notifications`

### 11.8 退出登录

* 右上角"退出登录"按钮
* 调 `POST /api/auth/logout`，清除会话后跳回 `/login`

***

## 12. 账户设置（Settings）

> 路径：`/settings`
>
> 用途：编辑个人资料、修改头像、查看账户详情和 AI 配额。

### 12.1 表单字段

| **字段** | **类型**     | **必填** | **说明**    |
| ------ | ---------- | ------ | --------- |
| 用户名    | Input      | 是      | 可修改       |
| 邮箱     | Input      | —      | 只读，不可修改   |
| 头像     | Input + 上传 | 否      | URL 或上传图片 |
| 通知偏好   | Switch     | 否      | 持久通知设置    |

### 12.2 操作

* **保存**：调 `PATCH /api/users/{id}` 提交修改
* **取消**：放弃修改
* **修改密码**：单独入口，调 `POST /api/auth/change-password`
* **删除账户**：危险操作（高危），需二次确认

### 12.3 账户详情卡

* 当前会员等级
* 每日 AI 限额
* 已使用次数（实时刷新）
* 额外余额
* 升级会员按钮（跳到 `/plans`）

### 12.4 头像上传

* 接受 JPG/PNG/GIF，小于 2MB
* 上传后立即预览
* 调 `POST /api/users/{id}/avatar`

***

## 13. 活动动态（Activity）

> 路径：`/activity`
>
> 用途：浏览关注动态、邀请列表，展示系统所有用户的活动流。

### 13.1 顶部

* 标题"活动动态"
* 副标题"查看关注的人的最新动态"

### 13.2 筛选

* 全部 / 关注的人 / 我的
* 类型筛选：消息/设备控制/自动化/订阅

### 13.3 活动流

每条活动显示：

| **元素** | **说明**              |
| ------ | ------------------- |
| 用户头像   | 操作者                 |
| 用户名    | ​                   |
| 动作描述   | "打开了水泵"、"创建了自动化..." |
| 时间     | 相对时间                |
| 目标     | 设备名/知识库名/会话标题       |
| 点赞/评论  | 部分版本支持              |

### 13.4 邀请列表（右侧栏）

* 显示你发出的邀请
* 状态：待接受/已接受/已过期
* 复制邀请链接按钮

***

## 14. 订阅与方案（Plans）

> 路径：`/plans`
>
> 用途：对比 free / pro / plus 三种方案，查看功能差异、升级会员。

### 14.1 切换

* **月度 / 年度**切换（月度按月计费，年度有折扣）
* 三个方案卡片横向排列

### 14.2 方案对比

#### Free（免费）

* 基础功能
* 每日 AI 限额：0 次
* 基础设备控制
* 1 个市场知识库订阅

#### Pro（专业版）

* 每日 AI 限额：70 次
* 高级设备控制（LED 调光等）
* 5 个市场知识库订阅
* MCP 插件：最多 5 个
* 历史数据：保留 30 天

#### Plus（无限版）

* 每日 AI 限额：999999（视为无限）
* 全部设备控制
* 无限知识库订阅
* MCP 插件：无限
* 历史数据：永久保留
* 优先客服支持

### 14.3 CTA 按钮

* Free：当前方案
* Pro / Plus：
  * 升级按钮 → 调起支付流程（支付宝/微信）
  * 已有 Pro 显示"当前方案"
* 退款政策说明
* 常见问题（FAQ 链接）

***

## 15. 企业部署申请（`/apply`）

> 用途：企业级定制方案申请。

### 15.1 表单字段

| **字段** | **类型**            | **必填** | **说明**   |
| ------ | ----------------- | ------ | -------- |
| 联系邮箱   | Input(type=email) | 是      | 企业邮箱     |
| 公司名称   | Input             | 是      | ​        |
| 使用场景   | TextArea          | 是      | 详细说明业务场景 |
| 期望上线时间 | Input(type=date)  | 否      | ​        |
| 联系电话   | Input             | 否      | ​        |

### 15.2 提交

* 点击"提交申请"调 `POST /api/apply`
* 成功后显示"提交成功，3 个工作日内联系"
* 同时可链接到"个人开发者注册"页面

***

## 16. 帮助与文档

### 16.1 帮助中心（`/help`）

* **顶部搜索框**：搜索 FAQ
* **分类导航**：
  * 入门指南
  * 设备控制
  * AI 助手
  * 自动化
  * 知识库
  * 账户与计费
  * 故障排查
* **FAQ 列表**：可展开/折叠
* **联系支持**：邮箱、微信群、提交工单

### 16.2 文档中心（`/docs`）

* 左侧目录（按章节）
* 右侧内容（Markdown 渲染）
* 包含：技术架构、API 文档、集成指南、最佳实践
* 顶部切换浅色/深色主题

### 16.3 隐私政策（`/privacy`）

* 法律声明
* 章节导航
* 数据收集说明
* Cookie 使用说明

### 16.4 服务条款（`/terms`）

* 用户协议
* 章节导航
* 账号注册须知
* 服务使用规范

***

## 17. 系统页面

### 17.1 访问被拒绝（`/access-denied`）

* 显示红色盾牌图标
* 标题"访问被拒绝"
* 说明：
  * 检测到可疑行为（频繁请求、恶意扫描、暴力破解等）
  * 封禁通常 24 小时后自动解除
  * 误判可联系管理员
* 错误代码：`403_SUSPICIOUS_ACTIVITY`
* 底部"返回首页"按钮

### 17.2 系统维护（`/maintenance`）

* 显示扳手图标
* 标题：管理员配置的维护标题
* 说明：管理员配置的维护信息
* 底部"管理员登录"链接

### 17.3 首页（`/` 与 `/landing`）

* 艺术风格品牌首页（`/`，ArtPage）
* 包含英雄区、监控演示、警告、逻辑、拓扑、页脚
* 着陆页（`/landing`）：更详细的产品介绍
* 顶部导航 + CTA 按钮
* 数据统计、案例展示

***

## 18. 常见问题

### 18.1 登录相关

**Q：忘记密码怎么办？**&#x41;：点击登录页"忘记密码"链接，输入邮箱接收验证码重置。

**Q：登录时弹出安全验证？**&#x41;：账号被检测到异地登录时，会要求邮箱二次验证。输入邮箱收到的 6 位验证码即可。

**Q：滑块验证码一直不通过？**&#x41;：可能是浏览器插件拦截，请尝试无痕模式或更换浏览器。

**Q：第三方登录失败？**&#x41;：查看 URL 中的 `?error=xxx` 参数，对照错误码处理。

### 18.2 AI 助手相关

**Q：AI 限额用完了怎么办？**&#x41;：升级到 pro/plus 会员，或等待次日重置。

**Q：AI 不知道我的设备状态？**&#x41;：检查 SSE 连接状态（页面右上角小圆点），若红色请刷新页面。

**Q：上传的文件 AI 看不到内容？**&#x41;：PDF/Word 需要 OCR 解析，等待几秒后重试。

**Q：如何让 AI 调用知识库？**&#x41;：使用 `@知识库:订阅的知识库名 你的问题` 格式。

### 18.3 设备控制相关

**Q：设备无法控制？**&#x41;：检查是否被授权该设备。联系管理员在后台"用户管理"中分配。

**Q：摄像头打不开？**&#x41;：检查网络。联系管理员确认摄像头 URL 配置正确。

**Q：步进电机不动？**&#x41;：检查供电。检查"stepper"权限是否被授予。

### 18.4 自动化相关

**Q：自动化没执行？**&#x41;：

* 检查策略是否启用
* 检查触发器条件是否正确
* 查看活动动态中的执行记录
* 部分规则需要后端调度器扫描

**Q：能执行几次？**&#x41;：默认无限次，可在策略中加冷却时间。

### 18.5 知识库相关

**Q：订阅的知识库 AI 不调用？**&#x41;：使用 `@知识库:名称 问题` 显式引用，AI 会优先检索。

**Q：知识库条目多久更新？**&#x41;：新上传的条目立即可用，embedding 完成后即可检索。

### 18.6 性能优化

* 大文件上传建议分批
* 高频操作（LED 调光）建议在滑动停止时再发送
* 大量历史数据查询指定较短时间范围
* 移动端建议使用 `/home` 而非 `/dashboard`

### 18.7 浏览器兼容

* 推荐：Chrome 100+ / Edge 100+ / Safari 15+
* 不支持 IE
* 移动浏览器需 iOS 15+ / Android 10+

### 18.8 键盘快捷键

| **快捷键**        | **功能**     |
| -------------- | ---------- |
| Enter          | 发送消息       |
| Shift+Enter    | 换行         |
| Ctrl+K / Cmd+K | 打开搜索/命令面板  |
| Esc            | 关闭弹窗       |
| Ctrl+S         | 保存（编辑器/设置） |

***

## 附录 A：API 接口汇总（用户层）

| **资源** | **主要接口**                                                                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 认证     | `/api/auth/login`、`/api/auth/logout`、`/api/auth/me`、`/api/auth/register`、`/api/auth/verify-email`、`/api/auth/send-verification`、`/api/auth/reset-password` |
| 第三方    | `/api/auth/alipay/login`、`/api/auth/qq/login`                                                                                                              |
| 设备     | `/api/device/relay`、`/api/device/led`、`/api/device/stepper`、`/api/device/logs`、`/api/device-history`                                                       |
| 监控     | `/api/greenhouse/cameras`                                                                                                                                  |
| AI     | `/api/chat`（流式 SSE）、`/api/chat/upload`、`/api/ai/voice`                                                                                                     |
| 自动化    | `/api/automation`（CRUD）、`/api/automation/{id}/toggle`、`/api/automation/{id}/run`                                                                           |
| MCP    | `/api/mcp/install`、`/api/mcp/uninstall`、`/api/mcp/custom`                                                                                                  |
| 知识库    | `/api/knowledge/market`、`/api/knowledge/items`、`/api/knowledge/upload`、`/api/knowledge/{id}/embed`                                                         |
| 用户     | `/api/users/{id}`、`/api/users/{id}/avatar`、`/api/activity`                                                                                                 |
| 活动     | `/api/activity`（公开动态流）                                                                                                                                     |
| 文件     | `/api/chat/upload`、`/api/users/{id}/avatar`                                                                                                                |

***

## 附录 B：术语表

| **术语**                       | **含义**                                |
| ---------------------------- | ------------------------------------- |
| 莓小智（Berry Smart）             | Stravision 平台内置 AI 助手的人格化名称           |
| SSE                          | Server-Sent Events，用于实时推送设备数据         |
| MCP                          | Model Context Protocol，扩展 AI 能力的插件协议  |
| RAG                          | Retrieval-Augmented Generation，检索增强生成 |
| VLM                          | Vision Language Model，视觉语言模型          |
| Embedding                    | 将文本转换为向量的过程，用于语义检索                    |
| GLM                          | 智谱大模型                                 |
| Rerank                       | 重排序，检索后二次排序提升精度                       |
| OCR                          | Optical Character Recognition，图片文字识别  |
| Recaptz                      | 阿里云滑块验证码                              |
| Dynamic Island               | 动态岛，顶部智能提示悬浮窗                         |
| Widget                       | 仪表板上的小组件                              |
| Trigger / Condition / Action | 自动化的触发器/条件/动作节点                       |

***

> 本手册基于 Stravision v4.0 源码编写，如遇功能更新请以实际界面为准。
