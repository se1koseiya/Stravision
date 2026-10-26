"use client";

/* ------------------------------------------------------------
   帮助中心 /help —— 2026-10-21 改版
   ─────────────────────────────────────────────────────────────
   两件事：
     ① 视觉：换成落地页 v4 的语言（LandingNav 悬浮胶囊 + 黄绿光斑 Hero
        + 圆角 28px 卡片 + 绿底 CTA 段 + LandingFooter），与 /docs、/changelog
        保持同一套观感；
     ② 文案：原来 13 条 FAQ 里有明显与实现不符的描述（阿里云滑块、Pro 才有
        WebSocket、“订单中心”开票、扫码添加设备、可手动开启 2FA……），
        这次按 USER_MANUAL.md + TECHNICAL_MANUAL.md 的真实实现重写并扩充到
        30+ 条，每条都给出具体路径、阈值与判断顺序。

   维护约定：
     · FAQ 的 a 里只用普通 <p> / <ul> / <li> / <strong> / <code> / <a>，
       样式统一在 components/help/help.css 的 .help-answer 里定义；
     · 搜索匹配靠 keywords 数组（不解析 JSX 文本，避免把标签当内容搜）；
     · 折叠面板用 Set 存多个展开项，允许同时展开多条对照着看。
   ------------------------------------------------------------ */

import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LandingThemeProvider } from "@/components/landing-v4/theme-provider";
import { CONTAINER, L, L_MIX, fadeUp } from "@/components/landing-v4/shared";
import { openSettings } from "@/components/settings/global-settings-host";
import {
  IconArrowRightUp,
  IconBrain,
  IconChartLine,
  IconClose,
  IconCpu,
  IconDown,
  IconLeaf,
  IconLightning,
  IconMail,
  IconSearch,
  IconShield,
  IconWallet,
} from "@/components/icon";
import "./help.css";

const LandingNav = dynamic(
  () => import("@/components/landing-v4/nav").then((m) => m.LandingNav),
  { ssr: false }
);

const LandingFooter = dynamic(
  () => import("@/components/landing-v4/download-cta").then((m) => m.LandingFooter),
  { ssr: false }
);

/* ---------------- 类型 ---------------- */

type CatId = "account" | "assistant" | "device" | "automation" | "data" | "billing";

interface Faq {
  id: string;
  cat: CatId;
  q: string;
  /** 搜索用的关键词（含同义词与英文缩写，方便“搜得到”） */
  keywords: string[];
  a: React.ReactNode;
}

interface CatMeta {
  id: CatId;
  title: string;
  desc: string;
  icon: typeof IconShield;
  tone: string;
}

/* ---------------- 分类 ---------------- */

const CATS: CatMeta[] = [
  {
    id: "account",
    title: "账号与登录",
    desc: "注册、登录、人机验证、二次验证、角色与权限",
    icon: IconShield,
    tone: L.mint,
  },
  {
    id: "assistant",
    title: "AI 助手",
    desc: "莓小智能力边界、额度、计划模式、记忆、语音、交付物",
    icon: IconBrain,
    tone: L.cyan,
  },
  {
    id: "device",
    title: "设备与控制",
    desc: "设备接入、在线判定、继电器 / 调光 / 云台、抓帧",
    icon: IconCpu,
    tone: L.blue,
  },
  {
    id: "automation",
    title: "自动化与通知",
    desc: "规则编排、AI 决策节点、定时任务、告警渠道",
    icon: IconLightning,
    tone: L.chip,
  },
  {
    id: "data",
    title: "数据与知识库",
    desc: "实时链路、历史保留、仪表盘、光谱与热力图、知识库",
    icon: IconChartLine,
    tone: L_MIX.platformCard,
  },
  {
    id: "billing",
    title: "订阅与额度",
    desc: "三档差异、额度重置、升级退款、企业部署",
    icon: IconWallet,
    tone: L_MIX.voices,
  },
];

/* ---------------- FAQ 数据 ---------------- */

const FAQS: Faq[] = [
  /* ============ 账号与登录 ============ */
  {
    id: "start",
    cat: "account",
    q: "第一次用，应该从哪里开始？",
    keywords: ["入门", "开始", "注册", "登录", "新账号", "注册流程", "onboarding"],
    a: (
      <>
        <p>按你的身份选一条路，三条入口都在首页导航里：</p>
        <ul>
          <li>
            <strong>个人使用</strong>：打开 <Link href="/register">注册</Link>，填邮箱、用户名（2–20 个字符）、
            密码（至少 8 位），过人机验证后拿 6 位邮箱验证码。验证码 10 分钟内有效，同一邮箱 60 秒后
            才能重发。
          </li>
          <li>
            <strong>已有账号</strong>：<Link href="/login">登录</Link> 支持邮箱 + 密码，
            也支持微信、企业微信、QQ、支付宝四种第三方登录。
          </li>
          <li>
            <strong>园区 / 企业</strong>：走 <Link href="/apply">企业部署申请</Link>，
            说明场地、棚数、网络条件，我们给部署形态建议。
          </li>
        </ul>
        <p>
          进来之后建议先读 <Link href="/docs">文档中心</Link> 里的《用户层操作手册》——
          它按页面和按钮写，比 FAQ 更细；要做二次开发再看 <Link href="/docs/api">接口参考</Link>。
        </p>
      </>
    ),
  },
  {
    id: "code-mail",
    cat: "account",
    q: "收不到邮箱验证码 / 验证码不通过",
    keywords: ["验证码", "收不到", "邮件", "OTP", "人机验证", "滑块", "过期", "重发"],
    a: (
      <>
        <p>按这个顺序排查，绝大多数卡在前两步：</p>
        <ul>
          <li>
            <strong>人机验证没过</strong>：验证通过后才会真正发信。平台用的是自托管的工作量证明校验，
            不依赖任何第三方服务，但浏览器插件（广告拦截、脚本管理）可能把它拦掉 —— 换无痕模式再试。
          </li>
          <li>
            <strong>重发间隔</strong>：同一邮箱 60 秒内只发一封，按钮会倒计时，急着连点不会更快。
          </li>
          <li>
            <strong>进了垃圾箱</strong>：事务邮件常有 1–2 分钟延迟，顺手看一下“推广 / 垃圾邮件”。
          </li>
          <li>
            <strong>邮箱写错了</strong>：验证码只发往注册邮箱，改邮箱需要重新走一遍流程。
          </li>
        </ul>
        <span className="help-note">验证码 10 分钟后失效，过期只能重新获取，上一封不能再用。</span>
      </>
    ),
  },
  {
    id: "reset-pwd",
    cat: "account",
    q: "忘记密码 / 想换密码",
    keywords: ["密码", "忘记密码", "重置", "找回", "改密码", "forgot"],
    a: (
      <>
        <ol>
          <li>
            打开 <Link href="/forgot-password">密码找回</Link>，填注册邮箱；
          </li>
          <li>过人机验证，接收 6 位验证码；</li>
          <li>填验证码 + 新密码（至少 8 位），提交后立刻生效；</li>
          <li>用新密码回 <Link href="/login">登录</Link> 即可。</li>
        </ol>
        <p>
          修改密码不会强制踢掉已登录的会话。在公共电脑或共享平板上用完，记得在头像菜单里
          <strong>退出登录</strong>，它会清掉登录 Cookie。
        </p>
      </>
    ),
  },
  {
    id: "second-check",
    cat: "account",
    q: "登录时弹出的「安全验证」是什么？能关掉吗？",
    keywords: ["安全验证", "二次验证", "2FA", "异地登录", "安全警告", "双因素"],
    a: (
      <>
        <p>
          这是异地或异常登录触发的二次校验：系统往注册邮箱发 6 位验证码，输入后才放行。
          风险较低时只弹「安全警告」，可以选择继续访问或取消。
        </p>
        <p>
          <strong>它不是一个可以手动开关的开关。</strong>平台目前不提供 TOTP（验证器 App）或短信动态口令，
          校验由风控自动判定，所以设置里找不到“开启两步验证”的入口 —— 如果你在别处的旧文档看到过，
          以这里为准。
        </p>
        <span className="help-note">
          换网络、用新设备、短时间多地登录都会更容易触发。常驻现场的值班电脑建议固定 IP 段。
        </span>
      </>
    ),
  },
  {
    id: "role-vs-plan",
    cat: "account",
    q: "角色、会员档位、AI 额度是三件不同的事吗？",
    keywords: ["角色", "权限", "会员", "档位", "超级管理员", "会员等级", "区别"],
    a: (
      <>
        <p>是的，三套东西各管一段，互不自动继承：</p>
        <ul>
          <li>
            <strong>角色</strong>管“能做什么”：普通用户、管理员、超级管理员。权限落在两项上 ——
            可控设备白名单 + 设备控制总开关。管理员不自动拥有后台所有能力，角色校验在接口层执行。
          </li>
          <li>
            <strong>会员档位</strong>管“AI 能用多少”：免费 / 专业 / 无限。它不影响你能否进后台。
          </li>
          <li>
            <strong>AI 额度</strong>是档位的具体表现：专业档每日 70 次，无限档不设实际上限，
            免费档不分配每日对话额度。
          </li>
        </ul>
        <p>
          另外还有第三层授权：<strong>组织 / 温室</strong>。被邀请加入组织时自动建立好友关系并授予对应设备权限，
          移出时自动回收 —— 人员变动即权限变动，不需要管理员再点一遍。
        </p>
      </>
    ),
  },
  {
    id: "access-denied",
    cat: "account",
    q: "被拦在「访问被拒绝」页面怎么办？",
    keywords: ["403", "访问被拒绝", "封禁", "限流", "429", "请求太频繁", "IP"],
    a: (
      <>
        <p>
          这是限流或地址封禁。阈值是这样的：全站<strong>每地址每分钟 300 次</strong>、
          登录<strong>每分钟 5 次</strong>、注册<strong>每分钟 3 次</strong>、
          认证类接口<strong>每 6 秒 1 次</strong>。超限的接口返回 429，页面跳到限流提示页。
        </p>
        <p>
          地址封禁默认 <strong>24 小时自动解除</strong>。如果确认是误判（比如整个办公室共用一个出口 IP），
          把错误代码和大致时间发给管理员，可以在后台手动解封。
        </p>
        <span className="help-note">
          本地一体化（桌面端）形态没有公网攻击面，默认不做限流，所以本地几乎不会遇到这个页面。
        </span>
      </>
    ),
  },
  {
    id: "desktop-vs-web",
    cat: "account",
    q: "桌面端和网页端有什么不一样？",
    keywords: ["桌面端", "客户端", "本地部署", "离线", "差异", "安装包", "web"],
    a: (
      <>
        <p>两种交付形态，功能一致、数据模型一致，差别在部署与网络依赖：</p>
        <ul>
          <li>
            <strong>桌面端（本地一体化，主形态）</strong>：数据库、消息代理、应用服务全部内置，
            双击就能用。断网时监控、控制、自动化、历史查询都不受影响；AI 可以指向公网模型，
            也可以指向园区内网的 OpenAI 兼容服务，构成完全离线的闭环。桌面端不消耗平台 AI 额度。
          </li>
          <li>
            <strong>网页端（云端集中）</strong>：容器化部署，多园区统一管理、远程运维，需要稳定网络。
          </li>
        </ul>
        <p>
          第一次在桌面端注册的账号自动获得超级管理员权限 —— 本地形态不依赖外部账号体系，
          所以没有“第一个管理员”的配置步骤。
        </p>
      </>
    ),
  },

  /* ============ AI 助手 ============ */
  {
    id: "ai-can-do",
    cat: "assistant",
    q: "莓小智能做什么？能力边界在哪？",
    keywords: ["AI", "能力", "能做什么", "助手", "工具", "功能", "边界"],
    a: (
      <>
        <p>它接的是平台的工具，所以能真正动到系统，而不只是聊天：</p>
        <ul>
          <li>
            <strong>读数据</strong>：空气温湿度、光照、CO₂、土壤四项（温湿度 / 电导率 / 酸碱度 / 氮磷钾）、
            11 通道光谱、摄像头画面。
          </li>
          <li>
            <strong>查与算</strong>：拉历史趋势、对比不同棚区、按阈值找异常时段、生成简报。
          </li>
          <li>
            <strong>下控制</strong>：四路继电器、四路 LED 调光、云台定位；高风险动作走确认流程。
          </li>
          <li>
            <strong>编规则</strong>：产出自动化草案，确认后才由画布落地 —— 模型不直接写库。
          </li>
          <li>
            <strong>出交付物</strong>：要报告给报告卡片（可导出），要代码给代码块（带复制与下载）。
          </li>
        </ul>
        <p>
          边界：它不负责传感器固件、不负责继电器电气实现、不开农药处方。判断结论只是建议，
          最终农事决策由你拍板。
        </p>
      </>
    ),
  },
  {
    id: "ai-quota",
    cat: "assistant",
    q: "为什么提示「需要开通会员」？额度怎么算？",
    keywords: ["额度", "会员", "次数", "限额", "70", "重置", "用完", "quota", "积分"],
    a: (
      <>
        <p>
          免费档不分配每日 AI 对话额度，所以第一次发消息就会提示开通。专业档<strong>每日 70 次</strong>，
          无限档不设实际上限；额度按<strong>自然日零点</strong>重置（服务端比对日期后清零）。
        </p>
        <p>两条账要分开看：</p>
        <ul>
          <li>
            <strong>每日次数</strong>：一次成功发起的对话算一次，跟回答长短无关。
          </li>
          <li>
            <strong>积分余额</strong>：按 token 结算，输入输出分别计权（输出权重 3），每千 token 折 1 积分，
            再乘模型倍率与全局系数。每日次数用完后可以走余额继续用。
          </li>
        </ul>
        <span className="help-note">
          单轮还有硬上限：输入 30 万 token、输出 6 万 token。上下文超了会自动压缩历史（摘要会以标记形式
          出现在对话里），不会静默截断。
        </span>
      </>
    ),
  },
  {
    id: "plan-mode",
    cat: "assistant",
    q: "「计划模式」是什么，什么时候用？",
    keywords: ["计划模式", "plan", "审批", "先方案", "只读", "确认"],
    a: (
      <>
        <p>
          复杂任务的“先看方案再动手”。进入计划模式后，写入类工具会被禁用，只剩只读工具，
          模型产出一份计划提交给你：<strong>你批准后才按计划执行</strong>，执行过程可以随时中断。
        </p>
        <p>适合这些场景：一次性改多条自动化规则、批量调整棚区参数、排查完再统一修。</p>
        <p>
          计划模式只影响“本次能不能改东西”，不影响它能读到什么。批准前的任何工具调用都不会落库。
        </p>
      </>
    ),
  },
  {
    id: "confirm",
    cat: "assistant",
    q: "为什么执行设备操作前总要我确认？",
    keywords: ["确认", "HITL", "二次确认", "危险操作", "为什么不执行", "确认框"],
    a: (
      <>
        <p>
          高风险工具（继电器、调光、云台这类直接改物理状态的，以及写库类工具）会挂起等你确认：
          助手把参数和影响范围摆出来，你点确认才真正下发。
        </p>
        <p>这是有意的设计 —— 一次误触可能影响整棚环境，代价远高于多点一下。顺带还有这些保护：</p>
        <ul>
          <li>设备指令下发后会回读状态确认，不是“发出去就算成功”；</li>
          <li>超时上限：继电器 10 秒、云台 90 秒、抓帧 20 秒；</li>
          <li>失败会写进操作日志与活动时间线，排查时有据可查。</li>
        </ul>
      </>
    ),
  },
  {
    id: "memory",
    cat: "assistant",
    q: "它记得我说过的话吗？",
    keywords: ["记忆", "记得", "memory", "上下文", "偏好", "跨会话"],
    a: (
      <>
        <p>三层记忆，生存周期各不相同：</p>
        <ul>
          <li>
            <strong>短期</strong>：当前会话最近的动作与观察（滑动窗口），只在本会话内有效。
          </li>
          <li>
            <strong>工作</strong>：本次请求的目标、子目标、已完成步骤、待执行动作，请求结束即释放。
          </li>
          <li>
            <strong>长期</strong>：跨会话保存的用户偏好、设备使用习惯、被验证有效的策略。
            由模型从对话里抽取，置信度达到 0.6 才落库，避免噪声污染。
          </li>
        </ul>
        <p>
          长期记忆以结构化档案存放在数据目录，可人工审阅和修订；换账号不共享，重装也会跟着数据目录走。
        </p>
      </>
    ),
  },
  {
    id: "personas",
    cat: "assistant",
    q: "三种人格有什么区别？",
    keywords: ["人格", "角色", "种植专家", "新手", "工程师", "语气", "风格"],
    a: (
      <>
        <ul>
          <li>
            <strong>种植专家</strong>（默认）：按农艺规范给建议，会主动提风险窗口和操作时机。
          </li>
          <li>
            <strong>新手向导</strong>：少术语、多步骤，把“在哪点哪个按钮”讲清楚，适合第一次上手的人。
          </li>
          <li>
            <strong>技术工程师</strong>：讲参数、报文结构、接口与阈值，适合排查链路上的问题。
          </li>
        </ul>
        <p>
          人格只改变表达方式与决策偏好，<strong>不改变工具权限</strong>。切换人格不会解锁新能力，
          也不会让高风险动作绕过确认。
        </p>
      </>
    ),
  },
  {
    id: "voice",
    cat: "assistant",
    q: "语音对话怎么用？能打断吗？",
    keywords: ["语音", "麦克风", "打断", "实时", "说话", "voice"],
    a: (
      <>
        <p>
          点输入区的麦克风按钮进入实时语音。首次使用需要在浏览器里授权麦克风权限，
          之后开口说话即可：浏览器端做静音检测（静音 150 毫秒判一句结束）再上行。
        </p>
        <p>
          播报过程中<strong>直接开口就能打断</strong>，不需要先点暂停。语音走的是独立的实时通道，
          和文字对话共用账号与额度。
        </p>
        <span className="help-note">
          桌面端为了启用浏览器端语音检测所需的共享内存能力，关闭了渲染进程沙箱，这是刻意做的取舍。
          如果麦克风一直没反应，先检查系统级输入设备与浏览器站点的麦克风权限。
        </span>
      </>
    ),
  },
  {
    id: "kb-ref",
    cat: "assistant",
    q: "怎么让它只按我的知识库回答？",
    keywords: ["知识库", "引用", "检索", "kb", "@知识库", "订阅"],
    a: (
      <>
        <p>
          先在 <Link href="/kb-store">知识库商店</Link> 订阅，或自己建一个集合；然后在提问时用
          <code>@知识库:名称 你的问题</code> 指定引用范围。
        </p>
        <p>
          检索是混合排序：向量相似度 + 全文检索，命中片段会在右侧引用面板列出来，可以点开核对原文。
          没指定知识库时，它不会主动去翻你的私有库。
        </p>
        <span className="help-note">
          刚建的集合如果还没完成向量化，第一轮可能检索不到。等状态变成“就绪”再问，或者先问一次触发重建。
        </span>
      </>
    ),
  },
  {
    id: "vision",
    cat: "assistant",
    q: "能看图吗？能看摄像头画面吗？",
    keywords: ["图片", "视觉", "摄像头", "抓帧", "诊断", "病虫害", "病历"],
    a: (
      <>
        <p>
          两种图都支持：直接把图片拖进输入框，或者直接说“看一下 1 号棚的摄像头”，它会调抓帧工具。
        </p>
        <ul>
          <li>识别走视觉网关，自动挑当前可用的支持视觉的模型，候选超时按数量均分；</li>
          <li>单次最多 3 张图，单张内联数据有大小上限，超大图会先降采样；</li>
          <li>结论包含判断、置信度、检出区域与建议，并写入病历；复诊会关联主病历，用来跟踪同一植株的恢复。</li>
        </ul>
        <span className="help-note">
          抓帧由后端完成，浏览器没有摄像头权限（这是安全响应头里固定关闭的）。所以“在浏览器里点开摄像头
          再截图“这条路走不通，直接让助手抓帧即可。
        </span>
      </>
    ),
  },
  {
    id: "deliverable",
    cat: "assistant",
    q: "回答里的「报告」和「代码」有什么区别？",
    keywords: ["报告", "代码", "交付物", "artifact", "导出", "代码块"],
    a: (
      <>
        <p>按你的意图二选一，不会互相替换：</p>
        <ul>
          <li>
            <strong>要报告 / 简报 / 分析</strong> → 报告卡片，结构化成稿，可直接导出。
          </li>
          <li>
            <strong>要代码 / 页面 / 组件</strong> → 代码块，带语言标识、复制与下载按钮。
          </li>
        </ul>
        <p>
          代码不会被“美化”成预览卡片 —— 那等于把你要的源码藏起来。两者也可能同时出现，
          但同一段代码始终以代码块形式交付。
        </p>
      </>
    ),
  },
  {
    id: "model-key",
    cat: "assistant",
    q: "想换成自己的模型 / 密钥放哪里？",
    keywords: ["模型", "密钥", "apikey", "api key", "换模型", "供应商", "配置", "baseurl"],
    a: (
      <>
        <p>
          打开
          <button
            type="button"
            onClick={() => openSettings("ai-services")}
            className="help-inline-btn"
          >
            设置 → AI 服务
          </button>
          ，可以添加模型厂商、填 <code>Base URL</code> 与 <code>API Key</code>、测连通性，再设成默认。
        </p>
        <ul>
          <li>
            <strong>一处生效全站</strong>：对话、图像诊断、报告生成、上下文压缩共用同一套有效模型配置，
            换默认模型后不用逐页再改。
          </li>
          <li>
            <strong>密钥不会明文外露</strong>：服务端加密存储（AES-256-GCM，密钥由环境变量派生），
            前端只看到掩码；多人共用一台服务器时，各自配各自的。
          </li>
          <li>
            <strong>桌面端可离线</strong>：把地址指向园区内网的 OpenAI 兼容服务，就是一条不出网的推理链路。
          </li>
        </ul>
        <span className="help-note">
          加了模型但对话仍报 401/404，先在这一页点“测试”，它会直接返回上游的原始错误 ——
          最常见的是 Base URL 少了 <code>/v1</code>，或者该模型不支持当前要用的能力（比如视觉）。
        </span>
      </>
    ),
  },
  {
    id: "no-state",
    cat: "assistant",
    q: "它说不知道设备状态 / 数据是旧的",
    keywords: ["不知道", "设备状态", "SSE", "实时", "刷新", "连接", "断线"],
    a: (
      <>
        <p>助手拿到的实时读数来自同一条事件流，所以顺序是：</p>
        <ol>
          <li>看对话页右上角的连接指示圆点，断开就刷新页面重连；</li>
          <li>去 <Link href="/monitor">实时监控</Link> 看同一设备是否有新数据 —— 那里也没更新，问题在设备侧，不在助手；</li>
          <li>确认设备在线（5 分钟没有上报就会被判离线，判定不依赖心跳）；</li>
          <li>都正常但回答仍是旧值，让它重新查一次（明确说“查当前值”），不要把上一轮的数字当结论。</li>
        </ol>
      </>
    ),
  },

  /* ============ 设备与控制 ============ */
  {
    id: "onboard-device",
    cat: "device",
    q: "怎么接入一台新设备？",
    keywords: ["接入", "添加设备", "新设备", "MQTT", "配对", "扫码", "注册设备"],
    a: (
      <>
        <p>
          平台<strong>没有“扫码添加”的自助入口</strong>，设备接入分两步，都需要管理员操作：
        </p>
        <ol>
          <li>
            <strong>登记设备</strong>：在后台把设备标识与它上报的 MQTT 主题登记进设备注册表，
            建立“主题 → 设备”的映射。基础订阅覆盖环境数据、光谱、十一路传感器三类主题。
          </li>
          <li>
            <strong>授予权限</strong>：在用户或组织里把该设备加进可控白名单。加入组织 / 温室时自动授予，
            移出时自动回收。
          </li>
        </ol>
        <p>
          设备侧只需要能连上消息代理：MQTT 5 over TLS，默认 8883（外部代理）或 11883（内置代理），
          服务质量 1，心跳 60 秒，重连间隔 5 秒，下行主题固定 <code>data/set</code>。
          接好后用“模拟上报”接口造一条数据，能出现在监控页就说明链路通了。
        </p>
      </>
    ),
  },
  {
    id: "offline",
    cat: "device",
    q: "设备显示离线 / 数据不刷新",
    keywords: ["离线", "掉线", "不刷新", "没数据", "在线状态", "5分钟", "断连"],
    a: (
      <>
        <p>在线判定按这个顺序，理解它就能自己定位：</p>
        <ol>
          <li>优先看内存里<strong>最近一次收到数据的时间</strong>；</li>
          <li>内存没有记录时，回查传感器读数表的<strong>最新一条</strong>；</li>
          <li>超过阈值（默认 <strong>5 分钟</strong>）判离线；</li>
          <li>完全没有过数据，判“未接入”—— 这和“离线”是两个不同状态，说明从来没连上过。</li>
        </ol>
        <p>判定不依赖设备心跳，所以断网后一分钟内就能被发现。对应地，排查顺序是：</p>
        <ul>
          <li>设备端是否真的在发（看设备本地日志）；</li>
          <li>消息代理是否连上（健康检查接口会返回代理连接状态）；</li>
          <li>后台登记的主题是否和设备实际上报的一致（主题写错表现为“永远未接入”）。</li>
        </ul>
      </>
    ),
  },
  {
    id: "relay",
    cat: "device",
    q: "四路继电器分别控制什么？",
    keywords: ["继电器", "水泵", "风机", "补光", "relay", "开关", "node0601"],
    a: (
      <>
        <p>四路固定映射，序号不能改：</p>
        <ul>
          <li><strong>第 1 路</strong>：水泵</li>
          <li><strong>第 2 路</strong>：风机（负压 / 通风）</li>
          <li><strong>第 3 路</strong>：RGB 补光</li>
          <li><strong>第 4 路</strong>：白光补光</li>
        </ul>
        <p>
          每路只有开 / 关两态。点击后页面会显示下发中，等状态回读确认才算成功，超时上限 10 秒。
          控制日志里会记录操作人、时间、指令和结果。
        </p>
        <span className="help-note">
          同一个继电器被自动化规则和手动同时操作时，以最后一次成功下发的指令为准；
          如果发现状态“自己跳回去”，多半是某条规则还在跑，去 <Link href="/automation">自动化</Link> 里看执行记录。
        </span>
      </>
    ),
  },
  {
    id: "led",
    cat: "device",
    q: "LED 调光和开关有什么不同？",
    keywords: ["LED", "调光", "亮度", "PWM", "0-255", "光谱", "补光"],
    a: (
      <>
        <p>
          继电器只有开 / 关，LED 是<strong>四路独立调光</strong>：取值范围 0–255，可以设中间亮度，
          也可以给不同通道不同配比（比如红光高一点、蓝光低一点）。
        </p>
        <p>
          调光值会随上行报文回读，页面显示的是设备确认后的当前亮度，不是你拖动的瞬时值。
          调光需要对应权限，普通账号不一定有 —— 看到滑块是灰的就是没授权。
        </p>
      </>
    ),
  },
  {
    id: "stepper",
    cat: "device",
    q: "云台（步进电机）怎么精确定位？",
    keywords: ["云台", "步进", "电机", "定位", "行程", "700", "预设点", "stepper"],
    a: (
      <>
        <p>
          行程 0–700 毫米，换算比 160 脉冲 / 毫米，最大 112000 脉冲。操作走“
          <strong>预设点位 + 方向微调</strong>”两步协议，不是直接给一个绝对坐标。
        </p>
        <ul>
          <li>刚上电或位置不确定时，先执行一次回原点，再走预设点，定位更稳；</li>
          <li>云台动作超时上限 90 秒，长行程会明显更慢，别在动作中反复点；</li>
          <li>抓帧前先把云台走到目标位，等动作完成后再抓，否则拍到的还是上一帧的角度。</li>
        </ul>
      </>
    ),
  },
  {
    id: "frame-fail",
    cat: "device",
    q: "页面能看画面，助手却说「画面无法获取」",
    keywords: ["抓帧", "摄像头", "画面", "无法获取", "RTSP", "RTMP", "协议", "截图"],
    a: (
      <>
        <p>
          这两条链路不一样：页面播放走流媒体解码，AI 抓帧走外部媒体工具。所以“页面能看、助手抓不到”
          是<strong>典型症状</strong>，不是矛盾。
        </p>
        <p>
          最常见的原因是流地址的协议和抓帧参数不匹配：抓帧参数必须按协议择一 ——
          <strong>RTSP 用传输方式参数（TCP），RTMP / HTTP 用读写超时参数</strong>。
          参数写错时媒体工具会因不支持该选项直接退出，表现就是“抓不到帧”，而播放链路完全正常。
        </p>
        <p>
          遇到这个组合，把摄像头编号和流协议类型发给管理员核对配置即可，不用怀疑设备本身。
        </p>
      </>
    ),
  },
  {
    id: "no-perm",
    cat: "device",
    q: "提示「权限不足」，点了没反应",
    keywords: ["权限", "无权限", "403", "不能控制", "白名单", "总开关", "授权"],
    a: (
      <>
        <p>设备控制是设备级授权，卡在两个地方：</p>
        <ul>
          <li>
            <strong>设备控制总开关</strong>：关掉时任何设备都不能控，页面上的按钮可能直接不响应。
          </li>
          <li>
            <strong>可控设备白名单</strong>：只对名单里的设备有权限，名单外的设备能看到数据但不能操作。
          </li>
        </ul>
        <p>
          让管理员在用户详情里把设备加进白名单，或者把你加入对应的组织 / 温室（加入即授权）。
          权限变更会即时生效，不需要重新登录。
        </p>
      </>
    ),
  },
  {
    id: "oplog",
    cat: "device",
    q: "在哪里查设备操作记录？",
    keywords: ["日志", "操作记录", "谁操作的", "审计", "activity", "活动"],
    a: (
      <>
        <p>
          <Link href="/activity">活动动态</Link> 是统一时间线：设备指令、AI 执行、关键动作都在里面，
          按时间倒序，可以按类型筛选。
        </p>
        <p>
          设备页自己的操作日志范围更小，只列<strong>这台设备</strong>的指令与结果，排查单台设备的问题时更快。
          两条记录都写“谁、什么时候、发了什么、结果如何”。
        </p>
      </>
    ),
  },

  /* ============ 自动化与通知 ============ */
  {
    id: "rule-editor",
    cat: "automation",
    q: "自动化规则怎么编？有哪些节点？",
    keywords: ["自动化", "规则", "编排", "节点", "画布", "editor", "AI 决策"],
    a: (
      <>
        <p>
          列表在 <Link href="/automation">自动化</Link>，显示规则名、启停状态、执行次数与最近执行结果；
          点进去是节点式画布（<code>/automation/editor</code>），拖拽连线、以流程图结构存库。
        </p>
        <p>四类节点：</p>
        <ul>
          <li><strong>触发</strong>：时间点 / 周期，或数据越过阈值；</li>
          <li><strong>逻辑</strong>：与、或、非，用来组合条件；</li>
          <li><strong>动作</strong>：继电器、LED 调光、AI 任务、提醒；</li>
          <li>
            <strong>AI 决策</strong>：把当前环境和历史数据交给模型判断，再决定是否继续往下走 ——
            适合“看情况”的策略，比如阴天不补光、连续高温才开机。
          </li>
        </ul>
        <p>
          也可以让助手起草规则，但草案必须经你确认后才由画布落地，模型不直接写库。
        </p>
      </>
    ),
  },
  {
    id: "not-triggered",
    cat: "automation",
    q: "规则配置好了却不触发",
    keywords: ["不触发", "没执行", "规则失效", "阈值", "条件", "优先级", "失败"],
    a: (
      <>
        <p>按这个顺序查，基本能一次定位：</p>
        <ol>
          <li><strong>规则是否启用</strong>：画布保存 ≠ 启用，列表里的开关才是。</li>
          <li>
            <strong>阈值与单位</strong>：温湿度上行报文是<strong>十倍整数</strong>（比如 23.6℃ 传 236），
            条件里写 23.6 就永远不成立。
          </li>
          <li><strong>逻辑短路</strong>：与条件里有一个恒为假，整条链就不会往下走。</li>
          <li><strong>规则互斥</strong>：另一条规则先把状态改了，看起来像“没生效”。</li>
          <li>
            <strong>执行失败</strong>：看执行日志 —— 超时、权限不足、AI 决策节点拿不到模型，都会记下来，
            但不会自动重试。
          </li>
        </ol>
        <span className="help-note">
          规则引擎吃的是设备上行数据。设备没上报时，条件永远不成立 —— 先确认设备在线，再看规则。
        </span>
      </>
    ),
  },
  {
    id: "scheduler",
    cat: "automation",
    q: "定时任务和自动化有什么区别？",
    keywords: ["定时任务", "cron", "调度", "周期", "区别", "系统任务"],
    a: (
      <>
        <p>
          <strong>自动化</strong>是“条件到了就动”，靠数据驱动；<strong>定时任务</strong>是“到点就动”，
          按周期表达式或指定时刻执行，动作只有四类：继电器、LED、AI 任务、提醒。
        </p>
        <p>系统自带三个定时任务，理解它们有助于解释一些“莫名其妙”的行为：</p>
        <ul>
          <li><strong>每日零点</strong>：清理过期传感器读数；</li>
          <li><strong>每 10 分钟</strong>：AI 主动巡检，检查设备离线与环境越界并生成告警；</li>
          <li><strong>每 60 秒</strong>：轮询到期的 AI 延迟任务。</li>
        </ul>
      </>
    ),
  },
  {
    id: "alert-channel",
    cat: "automation",
    q: "告警会从哪些渠道发出来？",
    keywords: ["告警", "通知", "邮件", "企业微信", "桌面通知", "推送", "冷却"],
    a: (
      <>
        <ul>
          <li><strong>邮件</strong>：验证码与告警邮件，模板统一管理；</li>
          <li>
            <strong>企业微信</strong>：环境异常汇总推到群机器人，同类异常有全局 30 分钟冷却，
            避免刷屏；
          </li>
          <li>
            <strong>桌面端系统通知</strong>：只在窗口处于后台且开关打开时发，同一标识会替换而不是叠加，
            1.2 秒内重复的合并；
          </li>
          <li><strong>站内公告</strong>：轻量通知，不走消息中心。</li>
        </ul>
        <p>
          通知渠道和“告警规则”是两件事：规则决定什么时候告警（在设备详情里设阈值），
          渠道决定告警送到哪。收不到告警时，先确认规则命中过（看执行日志），再查渠道配置。
        </p>
      </>
    ),
  },

  /* ============ 数据与知识库 ============ */
  {
    id: "realtime",
    cat: "data",
    q: "数据多久更新一次？",
    keywords: ["更新频率", "实时", "刷新", "SSE", "延迟", "多久", "秒级"],
    a: (
      <>
        <p>
          不是定时刷新，是<strong>来一条显示一条</strong>：设备按采集周期上报 → 服务端收到即写库 →
          通过事件流推送到页面。所以监控页的延迟取决于设备采集周期和网络，通常在秒级。
        </p>
        <p>
          历史图表是另一条路：按分钟聚合查询，切时间范围时重新取数，不会因为时间跨度变大而变慢到卡死。
        </p>
        <span className="help-note">
          页面上看到数字停住，先看右上角连接指示；连接正常但数字不动，问题在设备上报，不在页面。
        </span>
      </>
    ),
  },
  {
    id: "retention",
    cat: "data",
    q: "历史数据能留多久？怎么导出？",
    keywords: ["历史", "保留", "导出", "CSV", "Excel", "数据量", "多长"],
    a: (
      <>
        <p>
          保留策略和会员档位绑定：专业档 30 天，无限档长期保留。实际窗口还受部署方的清理任务配置影响 ——
          系统每天零点会清一次过期读数，桌面端本地形态可以在部署配置里调整。
        </p>
        <p>导出三条路：</p>
        <ul>
          <li>趋势卡上切换时间范围，逐段看（最快的临时查看方式）；</li>
          <li>走接口拉结构化数据（见 <Link href="/docs/api">接口参考</Link> 的数据查询部分），适合批量分析；</li>
          <li>让助手生成报告卡片，适合要交给别人看的场合。</li>
        </ul>
      </>
    ),
  },
  {
    id: "dashboard",
    cat: "data",
    q: "仪表盘能自己排吗？",
    keywords: ["仪表盘", "dashboard", "布局", "拖拽", "部件", "widget", "预设"],
    a: (
      <>
        <p>
          能。仪表盘是网格拖拽布局，布局持久化在本地；编辑模式下右侧打开部件库，增删部件、拖动位置、
          调整尺寸。
        </p>
        <p>
          可用部件：温度、湿度、光照、CO₂、土壤、天气、会员、AI 洞察、光谱卡、热力图。
          不想从零排的话有 6 套预设布局可以一键套用，套完再改。
        </p>
      </>
    ),
  },
  {
    id: "spectrum-heat",
    cat: "data",
    q: "光谱图和热力图分别看什么？",
    keywords: ["光谱", "热力图", "11 通道", "PAR", "分布", "温差", "415"],
    a: (
      <>
        <p>
          <strong>光谱图</strong>是 11 个通道（从 415nm 紫外边到近红外）的强度分布，用来判断光配方是否
          偏色、缺波段，或者灯具衰减 —— 补光策略调完之后，隔一两天对比同一时刻的曲线最直观。
        </p>
        <p>
          <strong>热力图</strong>是 42 格温湿度分布，看的是<strong>棚内均匀性</strong>：哪个角落温度低、
          风口附近湿度掉得快。整棚平均值正常但作物长势不齐，多数是这里的问题。
        </p>
      </>
    ),
  },
  {
    id: "kb", 
    cat: "data",
    q: "知识库怎么建、怎么让 AI 用上？",
    keywords: ["知识库", "kb", "集合", "条目", "版本", "协同", "检索", "订阅"],
    a: (
      <>
        <p>三条路都通：</p>
        <ul>
          <li>
            <strong>订阅现成的</strong>：<Link href="/kb-store">知识库商店</Link> 里挑，订阅后直接可用；
            档位限制订阅数量（专业档 5 个，无限档不限）。
          </li>
          <li>
            <strong>自己建</strong>：集合（目录树）+ 条目 + 标签，每次保存生成一个递增版本，能回滚。
          </li>
          <li>
            <strong>协同写</strong>：多人同时编辑走增量同步，断线后自动补写，定时生成快照。
            权限分只读、编辑、管理三档。
          </li>
        </ul>
        <p>
          内容会按标题层级切块、按哈希去重，再异步生成向量。检索时向量相似度和全文检索混合排序 ——
          所以专有名词和口语化提问都能搜到。
        </p>
      </>
    ),
  },

  /* ============ 订阅与额度 ============ */
  {
    id: "plans",
    cat: "billing",
    q: "三个方案差在哪？",
    keywords: ["方案", "套餐", "价格", "免费", "专业", "无限", "对比", "plan"],
    a: (
      <>
        <ul>
          <li>
            <strong>免费</strong>：基础功能与基础设备控制，可订阅 1 个市场知识库；不分配每日 AI 对话额度。
          </li>
          <li>
            <strong>专业</strong>：每日 70 次 AI，解锁高级设备控制（LED 调光等），
            5 个市场知识库，最多 5 个 MCP 插件，历史数据 30 天。
          </li>
          <li>
            <strong>无限</strong>：AI 不设实际上限，全部设备控制，知识库不限，MCP 不限，
            历史长期保留，优先支持。
          </li>
        </ul>
        <p>
          完整对照在 <Link href="/plans">订阅方案</Link>，按月 / 按年切换，年度有折扣。
        </p>
      </>
    ),
  },
  {
    id: "upgrade",
    cat: "billing",
    q: "怎么升级、降级、退款？能开发票吗？",
    keywords: ["升级", "降级", "退款", "发票", "支付", "支付宝", "微信", "变更"],
    a: (
      <>
        <ul>
          <li>
            <strong>升级</strong>：在 <Link href="/subscription">订阅管理</Link> 或
            <Link href="/plans">订阅方案</Link> 里选档位，支付渠道支持支付宝与微信，付款后额度立即生效。
          </li>
          <li>
            <strong>降级</strong>：随时可以改，<strong>到期后生效</strong>，当前周期内的服务继续有效。
          </li>
          <li>
            <strong>退款</strong>：已开始的周期不退款；重复支付、支付成功但未到账这类异常，凭订单信息联系客服处理。
          </li>
          <li>
            <strong>发票</strong>：需要发票、对公转账或年付议价，发邮件到
            <a href="mailto:hello@stravision.site">hello@stravision.site</a> 说明开票信息。
            平台目前没有自助开票入口。
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "quota-reset",
    cat: "billing",
    q: "额度用完了，除了升级还有别的办法吗？",
    keywords: ["额度用完", "重置", "等待", "积分", "余额", "次日"],
    a: (
      <>
        <p>三条：</p>
        <ul>
          <li><strong>等次日零点</strong>：每日次数按自然日重置，最省事；</li>
          <li><strong>用积分余额</strong>：每日次数用尽后仍可用余额继续，余额按时长/token 结算；</li>
          <li><strong>升级档位</strong>：专业档 70 次/日，无限档不设上限。</li>
        </ul>
        <p>
          想省额度的话：把长对话另开一个新会话（避免每轮都带很长的历史）、少让它重复分析同一批数据、
          需要固定结论时让它出报告而不是多轮追问。
        </p>
      </>
    ),
  },
  {
    id: "enterprise",
    cat: "billing",
    q: "多园区 / 企业版怎么部署？",
    keywords: ["企业", "多园区", "私有化", "部署", "apply", "离线", "本地"],
    a: (
      <>
        <p>
          在 <Link href="/apply">企业部署申请</Link> 提交：联系邮箱、公司名称、使用场景、期望上线时间、
          联系电话。<strong>3 个工作日内</strong>回复。
        </p>
        <p>两种形态按现场条件选：</p>
        <ul>
          <li>
            <strong>本地一体化</strong>：桌面安装包，现场断网也能跑，适合单个园区、示范项目、网络不稳定的场地；
          </li>
          <li>
            <strong>云端集中</strong>：容器编排部署，多园区统一管理、远程运维、多组织协作。
          </li>
        </ul>
        <p>
          两者业务代码与数据模型完全一致，所以可以先本地跑通再上云，功能与升级路径都不用重来。
        </p>
      </>
    ),
  },
];

/* ---------------- 组件 ---------------- */

function FaqCard({
  item,
  open,
  onToggle,
}: {
  item: Faq;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-[1.25rem] border transition-colors"
      style={{ borderColor: open ? L.accentStrong : L.hairline, background: L.card }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
      >
        <span
          className="text-[15px] font-semibold leading-[1.6]"
          style={{ color: open ? L.greenInk : L.ink }}
        >
          {item.q}
        </span>
        <IconDown
          className="mt-1 size-4 shrink-0 transition-transform duration-200"
          style={{
            color: open ? L.greenInk : L.muted,
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="help-answer px-6 pb-5">{item.a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HelpCenter() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CatId | "all">("all");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: FAQS.length };
    for (const f of FAQS) c[f.cat] = (c[f.cat] || 0) + 1;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      if (cat !== "all" && f.cat !== cat) return false;
      if (!q) return true;
      const hay = [f.q, ...f.keywords, CATS.find((c) => c.id === f.cat)?.title || ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, cat]);

  const grouped = useMemo(
    () =>
      CATS.map((c) => ({
        cat: c,
        items: filtered.filter((f) => f.cat === c.id),
      })).filter((g) => g.items.length > 0),
    [filtered]
  );

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pickCat = (id: CatId | "all") => {
    setCat((prev) => (prev === id && id !== "all" ? "all" : id));
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      // 减掉悬浮胶囊导航的高度，避免标题被压在导航下面
      const y = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    });
  };

  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#09090B]" style={{ color: L.ink }}>
      {/* Hero 渐变底 */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] overflow-hidden">
        <div
          className="absolute inset-0 opacity-100 dark:opacity-[0.14]"
          style={{
            background:
              "linear-gradient(97deg, rgba(255,248,94,0.28) 0%, rgba(255,248,94,0.12) 30%, rgba(117,255,159,0.30) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--lg-surface) 48%, transparent) 0%, transparent 42%, var(--lg-surface) 96%)",
          }}
        />
      </div>

      {/* Hero */}
      <div className={`relative ${CONTAINER} pb-6 pt-28 text-center lg:pt-36`}>
        <motion.p
          {...fadeUp()}
          className="m-0 flex items-center justify-center gap-3"
          style={{ color: L.greenInk, fontSize: "0.8125rem", fontWeight: 800, letterSpacing: "0.16em" }}
        >
          <span aria-hidden className="inline-block h-px w-6" style={{ background: L.greenInk }} />
          SUPPORT · BERRY REALM
        </motion.p>

        <motion.h1
          {...fadeUp(0.04)}
          className="m-0 mt-5 font-bold"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4.25rem)", lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          需要什么帮助？
        </motion.h1>

        <motion.p
          {...fadeUp(0.08)}
          className="mx-auto mt-6 max-w-[42rem] text-[1.06rem] leading-[1.8]"
          style={{ color: L.muted }}
        >
          先在这里找：按场景整理的操作说明、阈值口径与排查顺序。
          找不到再往下翻支持渠道 —— 我们工作日当天回。
        </motion.p>

        {/* 搜索 */}
        <motion.div {...fadeUp(0.12)} className="mx-auto mt-9 max-w-[42rem]">
          <div
            className="flex h-14 items-center gap-3 rounded-full border px-5 transition-[border-color,box-shadow] focus-within:shadow-[0_0_0_4px_rgba(94,233,181,0.24)]"
            style={{ background: L.card, borderColor: L.line }}
          >
            <IconSearch className="size-[18px] shrink-0" style={{ color: L.muted }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索问题：例如「设备离线」「额度」「抓帧」"
              aria-label="搜索帮助"
              className="h-full w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:opacity-60"
              style={{ color: L.ink }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="清空搜索"
                className="flex size-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: L_MIX.idle, color: L.muted }}
              >
                <IconClose className="size-3.5" />
              </button>
            )}
          </div>
        </motion.div>

        <motion.p {...fadeUp(0.16)} className="m-0 mt-5 text-[13px]" style={{ color: L.muted }}>
          {FAQS.length} 条常见问题 · {CATS.length} 个分类 · 支持邮箱 hello@stravision.site
        </motion.p>
      </div>

      {/* 分类卡 */}
      <div className={`relative ${CONTAINER} pt-14`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATS.map((c, i) => {
            const Icon = c.icon;
            const active = cat === c.id;
            return (
              <motion.button
                key={c.id}
                type="button"
                {...fadeUp(0.04 * i)}
                onClick={() => pickCat(c.id)}
                className="flex h-full flex-col rounded-[1.5rem] border p-6 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_1.25rem_2.75rem_rgba(34,34,34,0.1)]"
                style={{
                  background: c.tone,
                  borderColor: active ? L.accentStrong : "transparent",
                  boxShadow: active ? `inset 0 0 0 2px ${L.accentStrong}` : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex size-10 items-center justify-center rounded-xl"
                    style={{ background: "color-mix(in srgb, var(--lg-green-ink) 15%, transparent)", color: L.ink }}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="text-[12px] font-bold" style={{ color: L.muted }}>
                    {counts[c.id] || 0} 条
                  </span>
                </div>
                <h3 className="m-0 mt-4 text-[1.02rem] font-bold" style={{ color: L.ink }}>
                  {c.title}
                </h3>
                <p className="m-0 mt-2 text-[13px] leading-[1.7]" style={{ color: L.desc }}>
                  {c.desc}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 三步自查 */}
      <div className={`relative ${CONTAINER} pt-16`}>
        <div
          className="rounded-[1.5rem] border p-7"
          style={{ borderColor: L.hairline, background: L_MIX.preview }}
        >
          <p className="m-0 flex items-center gap-2 text-[12px] font-extrabold tracking-[0.14em]" style={{ color: L.greenInk }}>
            <IconLightning className="size-3.5" />
            故障自查三步
          </p>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "看连接",
                d: "页面右上角的连接圆点是实时的；断开就刷新重连。数据全都不动，先查这一步。",
              },
              {
                n: "02",
                t: "看设备",
                d: "监控页同一台设备有没有新数据。5 分钟无上报即判离线，问题通常在设备或代理侧。",
              },
              {
                n: "03",
                t: "看日志",
                d: "活动动态里按时间倒序找指令与结果；自动化不生效就看对应规则的执行记录。",
              },
            ].map((s) => (
              <div key={s.n} className="flex gap-3">
                <span className="text-[11px] font-extrabold tabular-nums" style={{ color: L.greenInk }}>
                  {s.n}
                </span>
                <div>
                  <p className="m-0 text-[13.5px] font-bold" style={{ color: L.ink }}>
                    {s.t}
                  </p>
                  <p className="m-0 mt-1.5 text-[12.5px] leading-[1.7]" style={{ color: L.muted }}>
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div id="faq-list" ref={listRef} className={`relative ${CONTAINER} scroll-mt-28 pb-24 pt-16`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className="m-0 font-bold"
              style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.98rem)", letterSpacing: "-0.01em" }}
            >
              {cat === "all" ? "常见问题" : CATS.find((c) => c.id === cat)?.title}
            </h2>
            <p className="m-0 mt-2 text-[13px]" style={{ color: L.muted }}>
              {query ? `“${query}” 命中 ${filtered.length} 条` : `共 ${filtered.length} 条，点标题展开`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(cat !== "all" || query) && (
              <button
                type="button"
                onClick={() => {
                  setCat("all");
                  setQuery("");
                }}
                className="inline-flex h-9 items-center rounded-full px-4 text-[12.5px] font-semibold"
                style={{ background: L_MIX.idle, color: L.muted }}
              >
                重置
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setOpenIds(
                  new Set(filtered.length > 0 && openIds.size < filtered.length ? filtered.map((f) => f.id) : [])
                )
              }
              className="inline-flex h-9 items-center rounded-full px-4 text-[12.5px] font-semibold"
              style={{ background: L.btnBg, color: L.btnFg }}
            >
              {openIds.size >= filtered.length && filtered.length > 0 ? "全部收起" : "全部展开"}
            </button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div
            className="mt-8 flex flex-col items-center rounded-[1.5rem] border px-6 py-16 text-center"
            style={{ borderColor: L.hairline, background: L_MIX.idle }}
          >
            <IconSearch className="size-7" style={{ color: L.muted }} />
            <p className="m-0 mt-4 text-[15px] font-semibold" style={{ color: L.ink }}>
              没找到对应的问题
            </p>
            <p className="m-0 mt-2 max-w-[26rem] text-[13.5px] leading-[1.7]" style={{ color: L.muted }}>
              换个更短的关键词试试（比如只搜“离线”或“额度”），或者直接发邮件给支持邮箱，
              把现象、时间、设备编号写清楚。
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <a
                href="mailto:hello@stravision.site"
                className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-bold"
                style={{ background: L.btnBg, color: L.btnFg }}
              >
                <IconMail className="size-4" />
                写邮件
              </a>
              <Link
                href="/docs"
                className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-bold"
                style={{ background: "color-mix(in srgb, var(--lg-green-ink) 15%, transparent)", color: L.ink }}
              >
                翻文档中心
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {grouped.map((g) => (
              <div key={g.cat.id}>
                {cat === "all" && (
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg" style={{ background: g.cat.tone, color: L.greenInk }}>
                      <g.cat.icon className="size-3.5" />
                    </span>
                    <span className="text-[13.5px] font-bold" style={{ color: L.ink }}>
                      {g.cat.title}
                    </span>
                    <span className="text-[12px]" style={{ color: L.muted }}>
                      {g.items.length} 条
                    </span>
                    <span aria-hidden className="ml-1 h-px flex-1" style={{ background: L.hairline }} />
                  </div>
                )}
                <div className="space-y-2.5">
                  {g.items.map((f) => (
                    <FaqCard
                      key={f.id}
                      item={f}
                      open={openIds.has(f.id)}
                      onToggle={() => toggle(f.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 仍未解决（绿底） */}
      <section className="relative overflow-hidden bg-[#6EE7B7] pb-24 pt-20 dark:bg-[#53BD83]">
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full border"
          style={{
            width: "22rem",
            aspectRatio: "1",
            top: "-9rem",
            right: "-6rem",
            borderColor: "color-mix(in srgb, #222222 10%, transparent)",
          }}
        />
        <div className={`relative ${CONTAINER} flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="max-w-[32rem]">
            <h2
              className="m-0 font-bold"
              style={{
                color: "#222222",
                fontSize: "clamp(1.9rem, 3vw, 2.6rem)",
                lineHeight: 1.22,
                letterSpacing: "-0.02em",
              }}
            >
              还是没解决？
              <br />
              把现象写清楚，我们来查
            </h2>
            <p className="m-0 mt-4 text-[14.5px] leading-[1.8]" style={{ color: "#2F4A3B" }}>
              邮件里带上这几项，能省掉一轮来回：<strong>发生时间</strong>、
              <strong>设备编号或棚区</strong>、<strong>你做了什么操作</strong>、
              <strong>页面上的报错原文或截图</strong>。
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row lg:flex-col xl:flex-row">
            <a
              href="mailto:hello@stravision.site"
              className="group inline-flex h-16 shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-8 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: "#222222", color: "#FFFFFF" }}
            >
              <IconMail className="size-4" />
              hello@stravision.site
              <IconArrowRightUp className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <Link
              href="/docs"
              className="inline-flex h-16 shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-8 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: "#FFFFFF", color: "#222222" }}
            >
              <IconLeaf className="size-4" />
              去文档中心自查
            </Link>
          </div>
        </div>

        <p className="relative mx-auto mt-10 w-[min(100%-2rem,80rem)] text-[12.5px]" style={{ color: "#2F4A3B" }}>
          服务时间：工作日 9:00 - 18:00。企业部署、对公合同与发票走
          <Link href="/apply" className="mx-1 font-bold underline" style={{ color: "#0F6B45" }}>
            企业部署申请
          </Link>
          ，3 个工作日内回复。
        </p>
      </section>
    </section>
  );
}

/** 页面壳：主题 + 悬浮导航 + 内容 + 页脚 */
export function HelpPageClient() {
  return (
    <LandingThemeProvider>
      <div className="min-h-screen bg-white dark:bg-[#09090B]">
        <LandingNav />
        <main className="pt-20">
          <HelpCenter />
        </main>
        <LandingFooter />
      </div>
    </LandingThemeProvider>
  );
}

export default HelpPageClient;
