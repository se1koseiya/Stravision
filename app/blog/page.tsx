import { redirect } from "next/navigation";

/**
 * 旧「文档库」入口 → 合并后的文档中心
 *
 * 2026-10-21：/blog（文档库）与 /docs（文档中心）合并为单一入口 /docs，
 * 这里只保留重定向，避免历史书签、外部链接与新导航出现两套列表页。
 */
export default function LegacyBlogListPage() {
  redirect("/docs");
}
