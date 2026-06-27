/**
 * 🍓 Berry Realm 统一设计系统
 *
 * 与 AI 助手页面（app/ai-assistant/page.tsx ConfigProvider）保持一致：
 * 主色 = Ant Design 默认蓝 #1677ff
 *
 * 所有业务卡片必须使用本文件定义的 token，保证视觉一致性。
 */

export const BERRY_THEME = {
  // ===== 品牌主色（Ant Design 默认蓝，与 AI 助手页一致）=====
  primary: '#1677ff',
  primaryHover: '#4096ff',
  primaryActive: '#0958d9',
  primaryLight: '#e6f4ff',     // blue-1
  primaryBg: '#f0f7ff',        // blue-0 浅背景
  primaryBorder: '#91caff',    // blue-3
  primaryText: '#002c8c',      // blue-9

  // ===== 状态色（沿用 antd 算法）=====
  status: {
    success: '#52c41a',
    processing: '#1677ff',
    warning: '#faad14',
    error: '#ff4d4f',
    pending: '#9ca3af',
  },

  // ===== 统一渐变（卡片背景）=====
  gradients: {
    cardHeader: (primary: string = '#1677ff') =>
      `linear-gradient(135deg, ${primary}15 0%, transparent 60%)`,
    cardHero: (primary: string = '#1677ff') =>
      `linear-gradient(135deg, ${primary}08 0%, ${primary}03 100%)`,
    success: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
    processing: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
    warning: 'linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)',
  },

  // ===== 统一圆角（与 antd borderRadius=12 对齐）=====
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },

  // ===== 统一阴影 =====
  shadow: {
    sm: '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
    md: '0 8px 24px -8px rgba(0, 0, 0, 0.08)',
    lg: '0 20px 50px -12px rgba(0, 0, 0, 0.1)',
  },
} as const

/**
 * 兼容旧代码：返回统一主色（不再按业务域区分）
 */
export function getDomainColor(_domain?: string): string {
  return BERRY_THEME.primary
}

/**
 * 按状态获取主题色
 */
export function getStatusColor(status: 'success' | 'processing' | 'warning' | 'error' | 'pending'): string {
  return BERRY_THEME.status[status]
}
