"use client";

import dynamic from "next/dynamic";
import { LandingThemeProvider } from "./theme-provider";
import { Changelog, type ChangelogEntryView } from "./changelog";

/* 注意：next/dynamic 的 options 必须是内联对象字面量；
   ssr:false 的 dynamic 不能出现在 Server Component 里，所以集中在这个 client 壳里 */
const LandingNav = dynamic(
  () => import("@/components/landing-v4/nav").then((m) => m.LandingNav),
  { ssr: false }
);

const LandingFooter = dynamic(
  () => import("@/components/landing-v4/download-cta").then((m) => m.LandingFooter),
  { ssr: false }
);

export function ChangelogPageClient({ entries }: { entries: ChangelogEntryView[] }) {
  return (
    <LandingThemeProvider>
      <div className="min-h-screen bg-white dark:bg-[#0C110E]">
        <LandingNav />
        <main className="pt-24">
          <Changelog entries={entries} />
        </main>
        <LandingFooter />
      </div>
    </LandingThemeProvider>
  );
}
