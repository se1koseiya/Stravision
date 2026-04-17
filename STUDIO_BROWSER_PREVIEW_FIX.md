# Studio浏览器预览修复

## 问题描述
当AI使用Exa搜索外部知识时，Studio会显示网页预览，但这是不必要的，因为搜索工具只是获取搜索结果，不需要显示网页。

## 根本原因
在 `app/ai-assistant/page.tsx` 第2462-2476行，代码会检测所有包含 `scrape` 或 `search` 的工具调用，并为它们设置 `browsingUrl` 和打开Studio。

```typescript
// 问题代码
if (args.url) {
    url = args.url
} else if (args.query) {
    // 对于 Exa/Brave 搜索，显示搜索关键词作为"虚拟网页"
    url = `https://search.engine/search?q=${encodeURIComponent(args.query)}`
}

if (url) {
     setBrowsingUrl(url)
     setCurrentBrowserUrl(url)
     setStudioOpen(true)
}
```

这导致搜索工具也会触发浏览器预览。

## 修复方案

### 区分工具类型
将工具分为两类：
1. **抓取类工具**：需要显示网页预览
   - `firecrawl_scrape`
   - `web_crawl`
   - `fetch_url`
   - 等包含 `scrape`、`crawl`、`fetch` 的工具

2. **搜索类工具**：不需要显示网页预览
   - `exa_search`
   - `brave_search`
   - 等包含 `search` 的工具

### 修复后的代码
```typescript
if (crawlerCall) {
    try {
        const args = JSON.parse(crawlerCall.function.arguments)
        let url = null
        
        // 只有真正的网页抓取工具才显示浏览器预览
        const isScrapeTool = crawlerCall.function.name.includes('scrape') || 
                           crawlerCall.function.name.includes('crawl') ||
                           crawlerCall.function.name.includes('fetch')
        
        if (isScrapeTool && args.url) {
            url = args.url
            setBrowsingUrl(url)
            setCurrentBrowserUrl(url)
            setStudioOpen(true)
        }
        // 搜索工具不设置 browsingUrl，不显示网页预览
    } catch (e) { console.error("Failed to parse crawler args", e) }
}
```

## 行为对比

### 修复前
| 工具 | Studio打开 | 浏览器预览 | 问题 |
|------|-----------|-----------|------|
| Exa Search | ✅ | ✅ 显示虚拟URL | ❌ 不必要 |
| Brave Search | ✅ | ✅ 显示虚拟URL | ❌ 不必要 |
| Firecrawl Scrape | ✅ | ✅ 显示真实URL | ✅ 正确 |

### 修复后
| 工具 | Studio打开 | 浏览器预览 | 结果 |
|------|-----------|-----------|------|
| Exa Search | ❌ | ❌ | ✅ 正确 |
| Brave Search | ❌ | ❌ | ✅ 正确 |
| Firecrawl Scrape | ✅ | ✅ 显示真实URL | ✅ 正确 |

## 用户体验改进

### 使用Exa搜索时
**修复前**：
1. AI调用Exa搜索
2. Studio自动打开
3. 显示虚拟URL：`https://search.engine/search?q=草莓种植`
4. 用户看到一个无用的网页预览

**修复后**：
1. AI调用Exa搜索
2. Studio不打开
3. 搜索结果直接显示在聊天中
4. 界面更简洁

### 使用Firecrawl抓取时
**修复前和修复后都一样**：
1. AI调用Firecrawl抓取网页
2. Studio自动打开
3. 显示真实URL：`https://example.com/article`
4. 用户可以看到网页预览

## 测试验证

### 测试用例1：Exa搜索
1. 输入："搜索草莓种植的最新技术"
2. AI调用 `mcp_exa_search`
3. **预期结果**：
   - Studio不打开
   - 搜索结果显示在聊天中
   - 没有浏览器预览

### 测试用例2：Firecrawl抓取
1. 输入："帮我抓取这个网页的内容 https://example.com"
2. AI调用 `mcp_firecrawl_scrape`
3. **预期结果**：
   - Studio自动打开
   - 显示网页预览
   - 可以看到抓取的内容

### 测试用例3：混合使用
1. 输入："搜索草莓病害，然后抓取第一个结果"
2. AI先调用 `mcp_exa_search`，再调用 `mcp_firecrawl_scrape`
3. **预期结果**：
   - 搜索时：Studio不打开
   - 抓取时：Studio打开并显示网页预览

## 相关文件
- `app/ai-assistant/page.tsx` - AI助手主页面（修改位置：第2462-2476行）

## 总结
修复后，搜索工具（Exa、Brave）不再触发Studio浏览器预览，只有真正的网页抓取工具（Firecrawl）才会显示预览。这让界面更简洁，用户体验更好。
