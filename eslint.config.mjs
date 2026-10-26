import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "stravision-app/**",
    "scripts/**",
    "public/draco/**",
  ]),

  /**
   * 提示（feedback）入口收口 —— 2026-10-21
   *
   * 项目里曾 sonner toast（447 处）与 antd message（279 处）并用，且 Toaster 也挂在
   * top-center，两者抢同一块屏幕位置、样式还不同 → 同一个操作会叠出两条不一样的提示。
   * 现在职责切开：toast = 右下角操作级轻反馈，message = 顶部居中系统级提示。
   * 两者统一从 `lib/ui/feedback.ts` 出，才能保证：
   *   ① 位置不再互相打架；
   *   ② message 拿到全局 <App> 的主题实例（否则掉回 antd 默认蓝）。
   *
   * 级别暂为 warn：存量 80+ 文件待分批迁移，先当待办清单用；清零后改 "error"。
   */
  {
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "sonner",
              importNames: ["toast"],
              message:
                '轻提示请改用 `import { toast } from "@/lib/ui/feedback"`（右下角，操作级反馈）。语义分工见该文件头注释。',
            },
            {
              name: "antd",
              importNames: ["message"],
              message:
                '全局提示请改用 `import { message } from "@/lib/ui/feedback"`（顶部居中，拿到全局 <App> 的主题实例）。语义分工见该文件头注释。',
            },
          ],
        },
      ],
    },
  },

  // 统一入口自己当然要直接 import 底层实现。
  {
    files: ["lib/ui/feedback.ts", "components/ui/feedback-host.tsx", "components/toaster-wrapper.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
