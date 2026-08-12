import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getManualBySlug, getManualSlugs } from "@/lib/blog/manuals";
import BlogReader from "./blog-reader";

export const dynamicParams = true;
export const revalidate = 0;

/** 静态预生成所有手册路径（仅用于构建时预渲染，运行时仍可动态匹配新 slug） */
export async function generateStaticParams() {
  const slugs = await getManualSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * 安全解码 slug：Next.js 16 在动态路由 params 中可能传递 URL 编码后的字符串，
 * 而manifest中存储的是解码后的原始字符串，需要先解码再查询。
 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** 动态生成元信息 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const manual = await getManualBySlug(decodeSlug(slug));
  if (!manual) {
    return {
      title: "未找到文档 · STRAVISION 莓界",
    };
  }
  return {
    title: `${manual.title} · STRAVISION 莓界文档库`,
    description: manual.description,
    keywords: manual.tags,
    openGraph: {
      title: manual.title,
      description: manual.description,
      type: "article",
    },
    authors: [{ name: "STRAVISION" }],
  };
}

export default async function ManualDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const manual = await getManualBySlug(decodeSlug(slug));

  if (!manual) {
    notFound();
  }

  // 将服务端读取的大对象传给客户端组件
  // 注意：rawMarkdown 可能很大，但 Next.js 会自动通过 RSC payload 传输
  return <BlogReader manual={manual} />;
}
