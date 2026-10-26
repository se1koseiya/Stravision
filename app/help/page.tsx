import type { Metadata } from "next";
import { HelpPageClient } from "@/components/help/help-page";

/**
 * 帮助中心 /help（2026-10-21 改版）
 *
 * 结构：服务端只负责 metadata，页面本体是客户端组件
 * （搜索 / 分类筛选 / 折叠面板都需要状态）。
 * 视觉与 /docs、/changelog 同源，全部取自落地页 v4 的设计令牌。
 *
 * FAQ 文案以 USER_MANUAL.md 与 TECHNICAL_MANUAL.md 的实现为准，
 * 改动实现后请同步这里（尤其是阈值、路径、档位额度）。
 */

export const metadata: Metadata = {
  title: "帮助中心 · 莓界 Berry Realm",
  description:
    "莓界帮助中心：账号与登录、AI 助手、设备与控制、自动化与通知、数据与知识库、订阅与额度的常见问题，含具体阈值、排查顺序与支持渠道。",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  return <HelpPageClient />;
}
