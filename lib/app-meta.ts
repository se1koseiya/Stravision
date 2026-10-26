/**
 * 应用版本号 / 版本代号 —— 全站唯一出口
 * ---------------------------------------------------------------------------
 * 🚨 版本号唯一真源 = 仓库根 `package.json` 的 `version`
 *    构建时由 `next.config.ts` 读出来、经 `NEXT_PUBLIC_APP_VERSION` 内联到客户端。
 * 🚨 版本代号唯一真源 = 本文件的 `APP_CODE_NAME`。
 *
 * 禁止在组件里再写 `v5.x.y` 一类字面量。升级版本的正确姿势：
 *   1) 改根 `package.json` 的 version
 *   2) 跑 `pnpm version:sync` —— 把 desktop/package.json 对齐
 *      （桌面端安装包文件名 / latest.yml / app.getVersion() 都取后者，不同步会
 *       出现「网页显示 A、安装包是 B」）
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"

/** 版本代号（随大版本更迭，当前代号：晨雾） */
export const APP_CODE_NAME = "晨雾"

/** 紧凑场景用：v5.2.7 */
export const APP_VERSION_TAG = `v${APP_VERSION}`

/** 完整标识用：v5.2.7 · 晨雾（关于页 / 更新页） */
export const APP_VERSION_LABEL = `${APP_VERSION_TAG} · ${APP_CODE_NAME}`
