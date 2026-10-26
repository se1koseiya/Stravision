import { redirect } from "next/navigation";

/**
 * 旧手册地址 /blog/[slug] → /docs/[slug]
 *
 * 2026-10-21 文档库并入文档中心后，手册详情页统一挂在 /docs 下；
 * 这里保留一条重定向，历史收藏、外部分享与后台预览的老链接不会 404。
 */
export default async function LegacyBlogDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/docs/${slug}`);
}
