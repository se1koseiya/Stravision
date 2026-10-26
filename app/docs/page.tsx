import type { Metadata } from "next";
import { listManuals } from "@/lib/blog/manuals";
import type { ManualMeta } from "@/lib/blog/manuals-shared";
import { DocsPageClient } from "@/components/docs/docs-hub";

/**
 * 文档中心（2026-10-21 合并）
 *
 * 这里原来是「System Modules」介绍页，与 /blog 的文档库是两个并行入口；
 * 现在两者合并：本页 = 文档库（手册列表 + 搜索 + 分类）+ 能力速查 + 开发者入口。
 *   · 手册数据源不变：lib/blog/manuals（与后台「文档管理」共用 docs-manifest.json）
 *   · 手册详情页迁移到 /docs/[slug]，旧地址 /blog 与 /blog/[slug] 走重定向
 *
 * revalidate = 0：manifest 由后台随时改写，页面必须每次重新读取，
 * 否则上传新文档后列表要等到下次构建才出现。
 */
export const revalidate = 0;

export const metadata: Metadata = {
  title: "文档中心 · 莓界 Berry Realm",
  description:
    "莓界文档中心：用户手册、管理员手册、开发文档与发布说明的统一入口，支持按角色分类与关键词检索；另含平台能力速查、接口参考与系统架构。",
  alternates: { canonical: "/docs" },
};

export default async function DocsPage() {
  let manuals: ManualMeta[] = [];
  try {
    manuals = await listManuals();
  } catch {
    // manifest 缺失 / 文件读不到时降级为空态，不让整页 500
    manuals = [];
  }

  return <DocsPageClient manuals={manuals} />;
}
