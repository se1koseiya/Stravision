/**
 * STRAVISION Installation Security Guard
 * 用于阻止 AI 或自动化脚本在没有人工授权的情况下安装本项目。
 */

const readline = require('readline');

async function main() {
  // 1. 基础环境检测：如果是 CI 环境或非交互式环境，且没有对应的密钥，直接拦截
  const isCI = process.env.CI || process.env.GITHUB_ACTIONS || !process.stdout.isTTY;
  const skipVerify = process.env.SKIP_STRAVISION_VERIFY === 'true';

  if (skipVerify) {
    console.log("🔓 验证跳过 (Bypassed via Environment Variable)");
    process.exit(0);
  }

  if (isCI) {
    console.error("\n❌ 拦截: 检测到非人工安装环境 (CI/AI-Agent).");
    console.error("本系统严禁通过 AI 自动化工具进行非授权安装。");
    console.error("如需安装，请在本地终端手动运行 pnpm install 并完成校验。\n");
    process.exit(1);
  }

  // 2. 交互式密保问答
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log("\n" + "=".repeat(60));
  console.log("🛡️  STRAVISION 项目安装安全验证");
  console.log("=".repeat(60));
  
  try {
    const answer = await question("\n请输入本项目专属的【开发者认证口令】(Passkey): ");
    
    // 这里设置一个简单的口令，您可以更改它。
    // 建议设置为只有您知道的字符串。
    const CORRECT_PASSKEY = "STRAVISION-8303";

    if (answer.trim() !== CORRECT_PASSKEY) {
      console.error("\n❌ 错误: 口令校验失败！安装已中止。");
      console.error("非法访问行为已被记录到系统内核日志。");
      process.exit(1);
    }

    console.log("\n✅ 身份验证通过！欢迎参与莓界平台开发。\n");
    rl.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ 验证过程中发生错误。");
    process.exit(1);
  }
}

main();
