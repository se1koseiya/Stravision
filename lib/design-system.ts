/**
 * 智慧农业平台设计系统
 * Design System v1.0
 * 
 * 基于设计规范文档创建的统一设计系统
 */

export const designSystem = {
  // 01 色彩系统 Color System
  colors: {
    // 主色 Primary
    primary: {
      DEFAULT: '#00D4AA',
      rgb: 'rgb(0, 212, 170)',
      rgba: (alpha: number) => `rgba(0, 212, 170, ${alpha})`,
    },
    
    // 辅助色 Secondary
    secondary: {
      DEFAULT: '#FF9F43',
      rgb: 'rgb(255, 159, 67)',
      rgba: (alpha: number) => `rgba(255, 159, 67, ${alpha})`,
    },
    
    // 中性色 Neutral
    neutral: {
      N900: '#0A1628',
      N800: '#1A263A',
      N700: '#2F3F5F',
      N600: '#4F5F7F',
      N500: '#6F7F9F',
      N400: '#8F9FBF',
      N300: '#AFBFDF',
      N200: '#CFD7E6',
      N100: '#E8ECF4',
      N50: '#F8F9FA',
    },
    
    // 功能色 Functional
    success: '#00D4AA',
    warning: '#FF9F43',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // 02 字体规范 Typography
  typography: {
    fontFamily: {
      sans: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
      mono: 'var(--font-geist-mono)',
      display: 'var(--font-geist-sans)',
    },
    
    fontSize: {
      h1: { size: '32px', lineHeight: '40px', weight: 500 },
      h2: { size: '28px', lineHeight: '36px', weight: 500 },
      h3: { size: '24px', lineHeight: '32px', weight: 500 },
      body: { size: '16px', lineHeight: '24px', weight: 400 },
      caption: { size: '14px', lineHeight: '20px', weight: 400 },
      number: { size: '24px', lineHeight: '32px', weight: 600 },
    },
    
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
    },
  },

  // 03 圆角与阴影 Radius & Shadow
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },

  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 4px 8px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.12)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.16)',
    
    // Dark mode shadows
    dark: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
      md: '0 4px 8px rgba(0, 0, 0, 0.4)',
      lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
      xl: '0 12px 24px rgba(0, 0, 0, 0.6)',
    },
  },

  // 04 核心组件 Core Components
  components: {
    // 设备卡片 Device Card
    deviceCard: {
      background: 'rgba(26, 38, 58, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '16px',
      backdropFilter: 'blur(20px)',
    },
    
    // 开关 Toggle
    toggle: {
      width: '48px',
      height: '24px',
      borderRadius: '12px',
      activeColor: '#00D4AA',
      inactiveColor: 'rgba(255, 255, 255, 0.2)',
    },
    
    // 徽章 Badge
    badge: {
      borderRadius: '8px',
      padding: '4px 8px',
      fontSize: '12px',
      colors: {
        success: { bg: 'rgba(0, 212, 170, 0.15)', text: '#00D4AA' },
        warning: { bg: 'rgba(255, 159, 67, 0.15)', text: '#FF9F43' },
        error: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' },
        info: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' },
      },
    },
    
    // 按钮 Button
    button: {
      primary: {
        background: '#00D4AA',
        color: '#FFFFFF',
        borderRadius: '8px',
        padding: '12px 24px',
        hover: 'rgba(0, 212, 170, 0.9)',
      },
      secondary: {
        background: 'rgba(0, 212, 170, 0.15)',
        color: '#00D4AA',
        borderRadius: '8px',
        padding: '12px 24px',
        hover: 'rgba(0, 212, 170, 0.25)',
      },
    },
  },

  // 05 导航与布局 Navigation & Layout
  layout: {
    sidebar: {
      width: '280px',
      background: 'rgba(10, 22, 40, 0.95)',
      backdropFilter: 'blur(20px)',
    },
    
    topbar: {
      height: '64px',
      background: 'rgba(26, 38, 58, 0.8)',
      backdropFilter: 'blur(20px)',
    },
  },

  // 06 按钮 Button States
  buttonStates: {
    primary: {
      default: '#00D4AA',
      hover: 'rgba(0, 212, 170, 0.9)',
      active: 'rgba(0, 212, 170, 0.8)',
      disabled: 'rgba(0, 212, 170, 0.3)',
    },
    secondary: {
      default: 'rgba(0, 212, 170, 0.15)',
      hover: 'rgba(0, 212, 170, 0.25)',
      active: 'rgba(0, 212, 170, 0.35)',
      disabled: 'rgba(0, 212, 170, 0.05)',
    },
  },

  // 07 表单 Form
  form: {
    input: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '12px 16px',
      focusBorder: '#00D4AA',
    },
    
    select: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '12px 16px',
    },
    
    checkbox: {
      size: '20px',
      borderRadius: '4px',
      activeColor: '#00D4AA',
    },
    
    radio: {
      size: '20px',
      activeColor: '#00D4AA',
    },
  },

  // 08 状态反馈 Feedback
  feedback: {
    loading: {
      color: '#00D4AA',
      size: '24px',
    },
    
    toast: {
      success: {
        background: 'rgba(0, 212, 170, 0.15)',
        border: '1px solid #00D4AA',
        icon: '✓',
      },
      error: {
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid #EF4444',
        icon: '✕',
      },
      warning: {
        background: 'rgba(255, 159, 67, 0.15)',
        border: '1px solid #FF9F43',
        icon: '⚠',
      },
      info: {
        background: 'rgba(59, 130, 246, 0.15)',
        border: '1px solid #3B82F6',
        icon: 'ℹ',
      },
    },
  },

  // 动画 Animations
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // 间距系统 Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
} as const;

// 工具函数
export const getColor = (path: string) => {
  const keys = path.split('.');
  let value: any = designSystem.colors;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) return null;
  }
  
  return value;
};

export const getRadius = (size: keyof typeof designSystem.radius) => {
  return designSystem.radius[size];
};

export const getShadow = (size: keyof typeof designSystem.shadow, isDark = false) => {
  if (isDark && typeof designSystem.shadow[size] === 'object') {
    return (designSystem.shadow[size] as any).dark || designSystem.shadow[size];
  }
  return designSystem.shadow[size];
};

// CSS 变量生成器
export const generateCSSVariables = () => {
  return `
    :root {
      --ds-primary: ${designSystem.colors.primary.DEFAULT};
      --ds-secondary: ${designSystem.colors.secondary.DEFAULT};
      --ds-success: ${designSystem.colors.success};
      --ds-warning: ${designSystem.colors.warning};
      --ds-error: ${designSystem.colors.error};
      --ds-info: ${designSystem.colors.info};
      
      --ds-radius-xs: ${designSystem.radius.xs};
      --ds-radius-sm: ${designSystem.radius.sm};
      --ds-radius-md: ${designSystem.radius.md};
      --ds-radius-lg: ${designSystem.radius.lg};
      --ds-radius-xl: ${designSystem.radius.xl};
      
      --ds-shadow-sm: ${designSystem.shadow.sm};
      --ds-shadow-md: ${designSystem.shadow.md};
      --ds-shadow-lg: ${designSystem.shadow.lg};
      --ds-shadow-xl: ${designSystem.shadow.xl};
    }
  `;
};

export default designSystem;
