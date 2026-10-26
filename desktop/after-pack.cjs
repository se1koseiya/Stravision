'use strict';

/**
 * 打包加固 · 第二步：翻 Electron Fuses（afterPack 钩子）。
 *
 * Fuses 是 Electron 二进制里的一组开关，打包期烧进去，运行期改不掉 ——
 * 它解决的是「用户拿到安装包后自己动手改」这一侧的问题：
 *
 *   OnlyLoadAppFromAsar + EnableEmbeddedAsarIntegrityValidation
 *     → app.asar 被改动（比如把 license-public-key.js 换成自己的公钥、把授权关卡注释掉）
 *       就通不过完整性校验，应用直接起不来。
 *     → 这是最实在的一条：把「解压 asar → 改 JS → 重新运行」这条路堵死。
 *
 *   EnableNodeOptionsEnvironmentVariable / EnableNodeCliInspectArguments
 *     → 不能用 `Stravision.exe --inspect` 或 NODE_OPTIONS 注入调试器 / 预加载脚本。
 *
 *   GrantFileProtocolExtraPrivileges
 *     → 收紧 file:// 协议权限。
 *
 * 🚨🚨 RunAsNode **必须保持 true（= 不禁用 ELECTRON_RUN_AS_NODE）**
 *   桌面端的架构就是「用 Electron 内置的 Node 跑子服务」：
 *     desktop/lib/servers.js:24-26  spawn(process.execPath, [script], {..., ELECTRON_RUN_AS_NODE: '1'})
 *   把 RunAsNode 翻成 false 后该环境变量被**静默忽略**，子进程会退化成"再启一个完整
 *   Electron 应用" → 加载 main.js → 撞上单实例锁 → quit(0)。
 *   现象极具迷惑性：日志里能看到子进程"已启动"，然后 0.2 秒后 `进程退出 code=0`，
 *   splash 永远停在「正在等待服务就绪…(72%)」。2026-09-29 踩过一次，别再"顺手加固"它。
 *   代价很小：开着 RunAsNode 顶多让人用我们的 exe 跑一段任意 JS，真正的防线是
 *   OnlyLoadAppFromAsar + AsarIntegrity（改不了 app.asar 里的授权逻辑）。
 *
 * ⚠️ 它挡不住「整包重新打包 + 自己签名分发」的人（那需要代码签名证书才谈得上防御），
 *    也不挡有耐心的逆向；目标是让"随手改两行就能免费用"不成立。
 */

const fs = require('node:fs');
const path = require('node:path');

/** 解析各平台下 Electron 可执行文件的路径 */
function electronBinary(appOutDir, platform, productName) {
  if (platform === 'darwin') {
    return path.join(appOutDir, `${productName}.app`, 'Contents', 'MacOS', productName);
  }
  const ext = platform === 'win32' ? '.exe' : '';
  return path.join(appOutDir, `${productName}${ext}`);
}

module.exports = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  const productName = packager?.appInfo?.productName || 'Stravision';
  const bin = electronBinary(appOutDir, electronPlatformName, productName);

  if (!fs.existsSync(bin)) {
    console.warn(`[fuses] ⚠️ 找不到 Electron 可执行文件：${bin}（跳过）`);
    return;
  }

  let flipFuses;
  let FuseVersion;
  let FuseV1Options;
  try {
    ({ flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses'));
  } catch (err) {
    console.warn(`[fuses] ⚠️ 未安装 @electron/fuses，跳过加固：${err.message}`);
    return;
  }

  const wanted = {
    // 🚨 必须是 true：子服务靠 ELECTRON_RUN_AS_NODE 启动，见文件头说明
    [FuseV1Options.RunAsNode]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  };

  try {
    await flipFuses(bin, { version: FuseVersion.V1, ...wanted });
    console.log('[fuses] ✅ 已加固：OnlyLoadAppFromAsar / AsarIntegrity / 禁用注入与调试');
  } catch (err) {
    // asar 完整性校验在极少数平台/版本组合下不支持 —— 退而求其次，只翻其它开关
    console.warn(`[fuses] ⚠️ 完整加固失败，改为保守组合：${err.message}`);
    try {
      const fallback = { ...wanted };
      delete fallback[FuseV1Options.EnableEmbeddedAsarIntegrityValidation];
      delete fallback[FuseV1Options.OnlyLoadAppFromAsar];
      await flipFuses(bin, { version: FuseVersion.V1, ...fallback });
      console.log('[fuses] ✅ 已加固（不含 asar 完整性校验）');
    } catch (err2) {
      console.warn(`[fuses] ❌ 加固失败（不影响打包产物，只是没有保护）：${err2.message}`);
    }
  }
};
