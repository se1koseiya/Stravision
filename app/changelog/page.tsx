import type { Metadata } from "next";
import { listPublishedChangelog } from "@/lib/db/changelog-service";
import { initDB } from "@/lib/db/database";
import { ChangelogPageClient } from "@/components/landing-v4/changelog-page";
import type { ChangelogEntryView } from "@/components/landing-v4/changelog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "产品更新日志 - 莓界 Berry Realm",
  description: "莓界产品更新日志：功能新增、体验优化与问题修复。",
};

export default async function ChangelogPage() {
  let entries: ChangelogEntryView[] = [];
  try {
    await initDB();
    entries = await listPublishedChangelog();
  } catch {
    entries = [];
  }

  return <ChangelogPageClient entries={entries} />;
}
