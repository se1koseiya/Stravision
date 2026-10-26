import { describe, it, expect } from "vitest"
import {
  hasReportIntent,
  isHtmlLang,
  looksLikeCodeArtifact,
  looksLikeReportHtml,
  isBareHtmlArtifact,
  extractReportTitle,
} from "../deliverable-classifier"

/**
 * 交付物分类：报告 vs 代码产物
 *
 * 事故背景（2026-10-11）：用户要代码，AI 助手把它包成了报告卡；连 ```html 代码块
 * 也被整体替换 → 源码消失。这里锁死判定口径，防止再次漂移。
 */

const REPORT_HTML = `<!DOCTYPE html>
<html><body>
  <div style="padding:24px">
    <h1>今日环境监测报告</h1>
    <p>摘要：温室整体良好，温度湿度均在适宜范围。</p>
    <table><tr><th>指标</th><th>数值</th></tr><tr><td>温度</td><td>24.5°C</td></tr></table>
  </div>
</body></html>`

const POMODORO_PAGE = `<!DOCTYPE html>
<html><body>
  <div id="app"></div>
  <script>
    let seconds = 25 * 60
    function tick() { document.title = seconds }
    document.addEventListener('click', tick)
    const btn = document.querySelector('#app')
  </script>
</body></html>`

const REACT_COMPONENT = `export default function Card({ title }) {
  return <div className="p-4">{title}</div>
}`

const BARE_FRAGMENT_ARTIFACT = `<div style="padding:16px">
  <button onclick="startTimer()">开始</button>
  <script>
    function startTimer() { window.alert('go') }
  </script>
</div>`

describe("hasReportIntent", () => {
  it("识别显式报告诉求", () => {
    expect(hasReportIntent("生成今日环境报告")).toBe(true)
    expect(hasReportIntent("帮我出一份周报")).toBe(true)
    expect(hasReportIntent("export report")).toBe(true)
  })

  it("不会把代码诉求误判成报告", () => {
    expect(hasReportIntent("帮我写一个番茄钟网页")).toBe(false)
    expect(hasReportIntent("写个 React 组件")).toBe(false)
    expect(hasReportIntent("给我一段 SQL")).toBe(false)
  })

  it("容忍非字符串输入（视觉消息数组 / undefined）", () => {
    expect(hasReportIntent(undefined, null, [{ type: "text" }])).toBe(false)
    expect(hasReportIntent(undefined, "继续")).toBe(false)
    expect(hasReportIntent("写代码", "根意图是生成报告")).toBe(true)
  })
})

describe("isHtmlLang", () => {
  it("识别 html 家族", () => {
    expect(isHtmlLang("html")).toBe(true)
    expect(isHtmlLang("HTML")).toBe(true)
    expect(isHtmlLang("xhtml")).toBe(true)
    expect(isHtmlLang("htm")).toBe(true)
  })

  it("其它语言不算 html", () => {
    expect(isHtmlLang("ts")).toBe(false)
    expect(isHtmlLang(undefined)).toBe(false)
  })
})

describe("looksLikeCodeArtifact", () => {
  it("脚本逻辑 / SPA 挂载点判为代码产物", () => {
    expect(looksLikeCodeArtifact(POMODORO_PAGE)).toBe(true)
    expect(looksLikeCodeArtifact(REACT_COMPONENT)).toBe(true)
    expect(looksLikeCodeArtifact(BARE_FRAGMENT_ARTIFACT)).toBe(true)
  })

  it("静态报告不算代码产物", () => {
    expect(looksLikeCodeArtifact(REPORT_HTML)).toBe(false)
  })
})

describe("looksLikeReportHtml", () => {
  it("语义 + 结构双证才判报告", () => {
    expect(looksLikeReportHtml(REPORT_HTML)).toBe(true)
  })

  it("程序型 HTML 永远不是报告", () => {
    expect(looksLikeReportHtml(POMODORO_PAGE)).toBe(false)
  })

  it("报告内嵌图表脚本仍算报告（脚本不足以否定报告身份）", () => {
    const chartReport = `<!DOCTYPE html><html><body>
      <div style="padding:24px">
        <h1>一周环境数据分析报告</h1>
        <p>摘要：本周温度波动 ±2°C。</p>
        <table><tr><th>指标</th><th>均值</th></tr><tr><td>温度</td><td>24.5</td></tr></table>
        <script>new Chart(document.getElementById('c'), { type: 'line' })</script>
      </div></body></html>`
    expect(looksLikeReportHtml(chartReport)).toBe(true)
  })

  it("只有结构没有报告语义 → 不是报告", () => {
    const landing = `${"<!-- padding -->"}<!DOCTYPE html><html><body>
      <h1>草莓种植服务平台</h1><h2>欢迎使用</h2>
      <div style="padding:40px">功能一</div><div style="padding:40px">功能二</div>
      <div style="padding:40px">功能三</div><div style="padding:40px">功能四</div>
    </body></html>`
    expect(looksLikeReportHtml(landing)).toBe(false)
  })

  it("过短内容不判报告（避免流式早期误包裹）", () => {
    expect(looksLikeReportHtml("<h1>报告</h1>")).toBe(false)
  })
})

describe("isBareHtmlArtifact", () => {
  it("裸 HTML 文档算代码产物", () => {
    expect(isBareHtmlArtifact(POMODORO_PAGE)).toBe(true)
  })

  it("报告与纯文本都不算", () => {
    expect(isBareHtmlArtifact(REPORT_HTML)).toBe(false)
    expect(isBareHtmlArtifact("今天温度 24.5 度，湿度 70%。")).toBe(false)
  })
})

describe("extractReportTitle", () => {
  it("优先 h1", () => {
    expect(extractReportTitle(REPORT_HTML)).toBe("今日环境监测报告")
  })

  it("退化到 title，再退化到兜底", () => {
    expect(extractReportTitle("<title>数据看板</title>", "兜底")).toBe("数据看板")
    expect(extractReportTitle("<div>无标题</div>", "兜底")).toBe("兜底")
  })
})
