import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getManualBySlug, getManualSlugs } from "@/lib/blog/manuals";
import ManualReader from "./manual-reader";

/**
 * 手册详情页（2026-10-21 从 /blog/[slug] 迁入）
 *
 * 路由优先级：/docs/api、/docs/architecture 是静态段，会优先于本动态段匹配，
 * 因此本页只接管「手册 slug」，不会被接口文档和架构页抢占。
 */

export const dynamicParams = true;
export const revalidate = 0;

/** 静态预生成已有手册路径（运行时仍可匹配后台新增的 slug） */
export async function generateStaticParams() {
  try {
    const slugs = await getManualSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

/** Next 可能传入 URL 编码后的 slug，manifest 里存的是解码后的原串 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const manual = await getManualBySlug(decodeSlug(slug)).catch(() => null);
  if (!manual) {
    return { title: "未找到文档 · 莓界 Berry Realm" };
  }
  return {
    title: `${manual.title} · 文档中心`,
    description: manual.description || manual.excerpt,
    keywords: manual.tags,
    alternates: { canonical: `/docs/${manual.slug}` },
    openGraph: {
      title: manual.title,
      description: manual.description || manual.excerpt,
      type: "article",
    },
    authors: [{ name: manual.author || "Stravision" }],
  };
}

export default async function ManualDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const manual = await getManualBySlug(decodeSlug(slug)).catch(() => null);

  if (!manual) notFound();

  return <ManualReader manual={manual} />;
}
