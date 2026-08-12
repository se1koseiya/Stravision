/**
 * 记忆画像报告生成器
 *
 * 汇总记忆系统学习到的用户偏好、设备模式、成功策略、执行统计，
 * 渲染为 Ant Design 风格的 HTML 报告，保存到"我的空间"。
 *
 * 这是记忆系统对用户的"透明化出口"：用户可以看到 AI 记住了什么。
 */
import {
  getAllUserPreferences,
  getDevicePatterns,
  getSuccessfulStrategies,
  getAgentStats
} from '@/lib/db/agent-memory-service';
import { DEVICE_NAMES } from '@/lib/constants';

export interface MemoryReportResult {
  title: string;
  html: string;
  summary: string;
}

/**
 * 生成记忆画像 HTML 报告
 */
export async function generateMemoryReport(userId: number): Promise<MemoryReportResult> {
  // 并行拉取所有记忆数据
  const [preferences, devicePatterns, strategies, stats] = await Promise.all([
    getAllUserPreferences(userId).catch(() => []),
    getDevicePatterns(userId).catch(() => []),
    getSuccessfulStrategies(userId).catch(() => []),
    getAgentStats(userId, 30).catch(() => ({
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0,
      topActions: []
    }))
  ]);

  const now = new Date();
  const formattedTime = now.toLocaleString('zh-CN', { dateStyle: 'long', timeStyle: 'short' });

  // 汇总数据计数
  const prefCount = preferences.length;
  const patternCount = devicePatterns.length;
  const strategyCount = strategies.length;

  const title = `记忆档案 · ${now.toLocaleDateString('zh-CN')}`;
  const summary = `已记忆 ${prefCount} 条偏好、${patternCount} 个设备模式、${strategyCount} 个成功策略`;

  const html = renderHTML({
    formattedTime,
    preferences,
    devicePatterns,
    strategies,
    stats,
    summary
  });

  return { title, html, summary };
}

// ─── 渲染辅助 ───

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function confidenceLabel(conf: number): { text: string; color: string } {
  if (conf >= 0.8) return { text: '高', color: '#52c41a' };
  if (conf >= 0.6) return { text: '中', color: '#faad14' };
  return { text: '低', color: '#d9d9d9' };
}

function preferenceKeyLabel(key: string): string {
  const map: Record<string, string> = {
    preferred_temperature: '偏好温度',
    preferred_humidity: '偏好湿度',
    preferred_light: '偏好光照',
    preferred_watering_time: '浇水时间',
    preferred_watering_duration: '浇水时长',
    preferred_strawberry_variety: '草莓品种',
    notification_preference: '通知偏好',
    response_detail_level: '回复详细程度',
    automation_preference: '自动化偏好',
    language_style: '语言风格',
    focus_area: '关注重点'
  };
  return map[key] || key;
}

function patternTypeLabel(type: string): string {
  const map: Record<string, string> = {
    high_temp_cooling: '高温降温',
    low_temp_lighting: '低温补光',
    high_humidity_ventilation: '高湿通风',
    low_humidity_irrigation: '低湿灌溉',
    morning_irrigation: '晨间灌溉',
    midday_irrigation: '午间灌溉',
    evening_irrigation: '傍晚灌溉',
    low_light_supplement: '弱光补光'
  };
  return map[type] || type;
}

interface RenderParams {
  formattedTime: string;
  preferences: Array<{ preference_key: string; preference_value: string; confidence: number }>;
  devicePatterns: Array<{ device_id: number; pattern_type: string; confidence: number; success_count: number; total_count: number; pattern_data?: string }>;
  strategies: Array<{ goal: string; steps: string; success_rate: number; avg_execution_time: number; use_count: number }>;
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgExecutionTime: number;
    topActions: Array<{ action: string; count: number }>;
  };
  summary: string;
}

function renderHTML(p: RenderParams): string {
  const { formattedTime, preferences, devicePatterns, strategies, stats, summary } = p;

  // 偏好列表（按置信度降序）
  const prefRows = preferences
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .map(pref => {
      const cl = confidenceLabel(pref.confidence);
      const pct = (pref.confidence * 100).toFixed(0);
      return `
        <tr>
          <td>${escapeHtml(preferenceKeyLabel(pref.preference_key))}</td>
          <td>${escapeHtml(pref.preference_value)}</td>
          <td><span class="tag" style="background:${cl.color}20;color:${cl.color}">${cl.text} · ${pct}%</span></td>
        </tr>`;
    }).join('');

  // 设备模式列表
  const patternRows = devicePatterns
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .map(pat => {
      const deviceName = DEVICE_NAMES[pat.device_id] || `设备${pat.device_id}`;
      const successRate = pat.total_count > 0 ? ((pat.success_count / pat.total_count) * 100).toFixed(0) : '0';
      const cl = confidenceLabel(pat.confidence);
      // 尝试解析 pattern_data 展示详情
      let detail = '';
      try {
        if (pat.pattern_data) {
          const data = JSON.parse(pat.pattern_data);
          const parts: string[] = [];
          if (data.temperature !== undefined) parts.push(`温度 ${data.temperature}°C`);
          if (data.humidity !== undefined) parts.push(`湿度 ${data.humidity}%`);
          if (data.hour !== undefined) parts.push(`${data.hour}:00`);
          if (data.action) parts.push(data.action);
          detail = parts.join(' / ');
        }
      } catch {}
      return `
        <tr>
          <td>${escapeHtml(deviceName)}</td>
          <td>${escapeHtml(patternTypeLabel(pat.pattern_type))}</td>
          <td>${escapeHtml(detail || '—')}</td>
          <td>${successRate}% <span class="muted">(${pat.success_count}/${pat.total_count})</span></td>
          <td><span class="tag" style="background:${cl.color}20;color:${cl.color}">${cl.text}</span></td>
        </tr>`;
    }).join('');

  // 成功策略列表
  const strategyRows = strategies
    .slice()
    .sort((a, b) => b.success_rate - a.success_rate)
    .map(s => {
      const rate = (s.success_rate * 100).toFixed(0);
      const avgSec = (s.avg_execution_time / 1000).toFixed(1);
      let steps = '';
      try {
        const arr = JSON.parse(s.steps);
        if (Array.isArray(arr)) steps = arr.join(' → ');
      } catch {}
      return `
        <tr>
          <td>${escapeHtml(s.goal)}</td>
          <td>${escapeHtml(steps || '—')}</td>
          <td>${rate}%</td>
          <td>${avgSec}s <span class="muted">(${s.use_count}次)</span></td>
        </tr>`;
    }).join('');

  // 执行统计
  const successRate = stats.totalExecutions > 0
    ? ((stats.successfulExecutions / stats.totalExecutions) * 100).toFixed(0)
    : '0';
  const topActionsHtml = stats.topActions.length > 0
    ? stats.topActions.map(a => `<span class="stat-chip">${escapeHtml(a.action)} · ${a.count}</span>`).join('')
    : '<span class="muted">暂无数据</span>';

  const prefSection = preferences.length > 0
    ? renderSection('用户偏好', `已学习 ${preferences.length} 条`, `
      <table class="data-table">
        <thead><tr><th>偏好项</th><th>值</th><th>置信度</th></tr></thead>
        <tbody>${prefRows}</tbody>
      </table>`)
    : renderEmptySection('用户偏好', 'AI 尚未从对话中学习到明确的偏好。当你说出"我喜欢/习惯..."这类话时，会被自动记录。');

  const patternSection = devicePatterns.length > 0
    ? renderSection('设备使用模式', `已识别 ${devicePatterns.length} 个`, `
      <table class="data-table">
        <thead><tr><th>设备</th><th>模式</th><th>触发条件</th><th>成功率</th><th>置信度</th></tr></thead>
        <tbody>${patternRows}</tbody>
      </table>`)
    : renderEmptySection('设备使用模式', '当你控制设备（如高温时开风扇、定时浇水）时，AI 会自动识别使用模式。');

  const strategySection = strategies.length > 0
    ? renderSection('成功策略', `已积累 ${strategies.length} 个`, `
      <table class="data-table">
        <thead><tr><th>目标</th><th>步骤</th><th>成功率</th><th>使用情况</th></tr></thead>
        <tbody>${strategyRows}</tbody>
      </table>`)
    : renderEmptySection('成功策略', '完成多步骤任务后，AI 会记住成功的操作路径，下次遇到类似任务可参考。');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>记忆档案</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f5f7fa;
    color: rgba(0,0,0,0.88);
    font-weight: 400;
    line-height: 1.5715;
    padding: 24px;
  }
  .container { max-width: 860px; margin: 0 auto; }
  .header {
    background: #fff;
    border-radius: 8px;
    padding: 32px 40px;
    margin-bottom: 16px;
    border: 1px solid #f0f0f0;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 500;
    color: rgba(0,0,0,0.88);
    margin-bottom: 8px;
  }
  .header .meta {
    color: rgba(0,0,0,0.45);
    font-size: 14px;
  }
  .header .summary {
    margin-top: 16px;
    padding: 12px 16px;
    background: #e6f4ff;
    border: 1px solid #bae0ff;
    border-radius: 6px;
    color: #1677ff;
    font-size: 14px;
  }
  .section {
    background: #fff;
    border-radius: 8px;
    padding: 24px 32px;
    margin-bottom: 16px;
    border: 1px solid #f0f0f0;
  }
  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;
  }
  .section-title h2 {
    font-size: 16px;
    font-weight: 500;
    color: rgba(0,0,0,0.88);
  }
  .section-title .count {
    font-size: 13px;
    color: #1677ff;
    background: #e6f4ff;
    padding: 2px 10px;
    border-radius: 10px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .data-table th {
    text-align: left;
    padding: 10px 12px;
    background: #fafafa;
    color: rgba(0,0,0,0.65);
    font-weight: 500;
    border-bottom: 1px solid #f0f0f0;
    white-space: nowrap;
  }
  .data-table td {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    color: rgba(0,0,0,0.88);
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: #fafafa; }
  .tag {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 20px;
    white-space: nowrap;
  }
  .muted { color: rgba(0,0,0,0.45); font-size: 13px; }
  .empty {
    text-align: center;
    padding: 32px 16px;
    color: rgba(0,0,0,0.45);
    font-size: 14px;
  }
  .empty .hint { margin-top: 8px; font-size: 13px; color: rgba(0,0,0,0.35); }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .stat-card {
    background: #fafafa;
    border-radius: 6px;
    padding: 16px;
    text-align: center;
  }
  .stat-card .value {
    font-size: 24px;
    font-weight: 500;
    color: #1677ff;
    line-height: 1.2;
  }
  .stat-card .label {
    font-size: 13px;
    color: rgba(0,0,0,0.45);
    margin-top: 4px;
  }
  .stat-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-chip {
    background: #f5f5f5;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 13px;
    color: rgba(0,0,0,0.65);
  }
  .footer {
    text-align: center;
    color: rgba(0,0,0,0.35);
    font-size: 13px;
    padding: 16px 0;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>记忆档案</h1>
    <div class="meta">生成时间：${escapeHtml(formattedTime)}</div>
    <div class="summary">${escapeHtml(summary)}</div>
  </div>

  ${prefSection}
  ${patternSection}
  ${strategySection}

  <div class="section">
    <div class="section-title">
      <h2>执行统计</h2>
      <span class="count">近 30 天</span>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="value">${stats.totalExecutions}</div>
        <div class="label">总执行次数</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.successfulExecutions}</div>
        <div class="label">成功次数</div>
      </div>
      <div class="stat-card">
        <div class="value">${successRate}%</div>
        <div class="label">成功率</div>
      </div>
      <div class="stat-card">
        <div class="value">${(stats.avgExecutionTime / 1000).toFixed(1)}s</div>
        <div class="label">平均耗时</div>
      </div>
    </div>
    <div style="font-size:13px;color:rgba(0,0,0,0.65);margin-bottom:8px">高频操作</div>
    <div class="stat-chips">${topActionsHtml}</div>
  </div>

  <div class="footer">
    以上内容由 AI 助手自动学习并整理 · 记忆数据仅你可见 · 可在"我的空间"随时查看与删除
  </div>
</div>
</body>
</html>`;
}

function renderSection(title: string, countText: string, content: string): string {
  return `
  <div class="section">
    <div class="section-title">
      <h2>${escapeHtml(title)}</h2>
      <span class="count">${escapeHtml(countText)}</span>
    </div>
    ${content}
  </div>`;
}

function renderEmptySection(title: string, hint: string): string {
  return `
  <div class="section">
    <div class="section-title">
      <h2>${escapeHtml(title)}</h2>
      <span class="count">0</span>
    </div>
    <div class="empty">
      暂无数据
      <div class="hint">${escapeHtml(hint)}</div>
    </div>
  </div>`;
}
