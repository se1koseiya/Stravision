const { createRequire } = require("module");
const req = createRequire("file:///C:/Users/24121/.workbuddy/binaries/node/workspace/node_modules/");
const puppeteer = req("puppeteer-core");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--proxy-server=direct://", "--proxy-bypass-list=*", "--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:3200/dev-ae-export?only=chat__message-context-menu", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector('[data-ae-ready="1"]', { timeout: 120000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(() => {
    const bg = (e) => {
      if (!e) return "?";
      const c = getComputedStyle(e);
      return `${c.backgroundColor} | img:${c.backgroundImage.slice(0, 40)}`;
    };
    const out = {
      html: bg(document.documentElement),
      body: bg(document.body),
      bodyChildren: [...document.body.children].map(
        (e) => `<${e.tagName.toLowerCase()}> cls="${String(e.className).slice(0, 60)}" bg=${bg(e)}`
      ),
    };
    out.nextPortal = [...document.querySelectorAll("nextjs-portal")].map((e) => {
      const c = getComputedStyle(e);
      return `pos=${c.position} z=${c.zIndex} bg=${c.backgroundColor}`;
    });
    out.overlays = [...document.querySelectorAll("[role=dialog],[role=alertdialog],[data-radix-popper-content-wrapper],[data-sonner-toaster],[class*=ant-modal],[class*=ant-message],[class*=ant-notification],[data-radix-portal]")]
      .slice(0, 10)
      .map((e) => `<${e.tagName.toLowerCase()}> cls="${String(e.className).slice(0, 50)}"`);
    // 找出覆盖视口且有背景的元素
    out.fullscreenPainters = [...document.querySelectorAll("*")]
      .filter((e) => {
        const c = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        const solid = c.backgroundColor && c.backgroundColor !== "rgba(0, 0, 0, 0)";
        return solid && r.width > 400 && r.height > 200;
      })
      .slice(0, 12)
      .map((e) => `<${e.tagName.toLowerCase()}> cls="${String(e.className).slice(0, 50)}" bg=${getComputedStyle(e).backgroundColor} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
    out.stageChain = [];
    let el = document.querySelector("[data-ae-id]");
    while (el && el !== document.documentElement) {
      out.stageChain.push(`<${el.tagName.toLowerCase()}> cls="${String(el.className).slice(0, 50)}" bg=${getComputedStyle(el).backgroundColor}`);
      el = el.parentElement;
    }
    return out;
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
