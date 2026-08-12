import type { Metadata } from "next";
import { listManuals } from "@/lib/blog/manuals";
import BlogList from "./blog-list";

export const metadata: Metadata = {
  title: "文档库 · STRAVISION 莓界",
  description:
    "STRAVISION 莓界用户手册、管理员手册、开发文档与发布说明的集中入口，支持全文检索与章节导航。",
};

export const revalidate = 0;

export default async function BlogPage() {
  const manuals = await listManuals();
  return <BlogList manuals={manuals} />;
}
