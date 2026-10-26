import type { Metadata } from "next";
import { WhatsNewPage } from "@/components/landing-v4/whats-new";

export const metadata: Metadata = {
  title: "产品更新 - 莓界 Berry Realm",
  description:
    "本次更新带来会动手的 Copilot、三档可调的沉浸光感材质，以及能直接操作流程画布的画布助手。",
};

export default function Page() {
  return <WhatsNewPage />;
}
