import { Layout } from "react-grid-layout"

export type WidgetSize = 'small' | 'medium' | 'large'

export interface WidgetConfig {
  id: string
  size: WidgetSize
  component: string
  title: string
  priority: number // 1-5, 5 being highest priority
}

// 定义组件尺寸映射 (w x h)
export const WIDGET_DIMENSIONS = {
  small: { w: 2, h: 2 },   // 小：正方形 (2x2)
  medium: { w: 4, h: 2 },  // 中：横向长方形 (4x2) 
  large: { w: 4, h: 4 }    // 大：正方形 (4x4)
}

// 预定义的组件配置
export const WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'heatmap', size: 'large', component: 'HeatmapWidget', title: '环境时段热力图', priority: 5 },
  { id: 'temperature', size: 'medium', component: 'TemperatureWidget', title: '温度监测', priority: 4 },
  { id: 'humidity', size: 'medium', component: 'HumidityWidget', title: '湿度监测', priority: 4 },
  { id: 'weather', size: 'medium', component: 'WeatherWidget', title: '天气状况', priority: 3 },
  { id: 'weather-forecast', size: 'large', component: 'WeatherForecastWidget', title: '天气预报', priority: 2 },
  { id: 'soil', size: 'medium', component: 'SoilWidget', title: '土壤监测', priority: 3 },
  { id: 'light', size: 'small', component: 'LightWidget', title: '光照强度', priority: 2 },
  { id: 'co2', size: 'small', component: 'CO2Widget', title: 'CO₂浓度', priority: 2 },
  { id: 'fertility', size: 'small', component: 'FertilityWidget', title: '土壤肥力', priority: 1 },
  { id: 'nitrogen', size: 'small', component: 'NitrogenWidget', title: '氮含量', priority: 1 },
  { id: 'phosphorus', size: 'small', component: 'PhosphorusWidget', title: '磷含量', priority: 1 },
  { id: 'potassium', size: 'small', component: 'PotassiumWidget', title: '钾含量', priority: 1 },
  { id: 'spectral', size: 'large', component: 'SpectralCard', title: '光谱分析', priority: 2 },
  { id: 'membership', size: 'medium', component: 'MembershipCard', title: '会员信息', priority: 1 }
]

// 布局预设
export const LAYOUT_PRESETS = {
  // 默认视图 - 平衡布局
  default: {
    name: '默认视图',
    description: '平衡显示所有重要数据',
    layout: [
      { i: 'heatmap', x: 0, y: 0, w: 4, h: 4 },      // 大：环境时段热力图
      { i: 'temperature', x: 4, y: 0, w: 4, h: 2 },     // 中：温度
      { i: 'humidity', x: 8, y: 0, w: 4, h: 2 },        // 中：湿度
      { i: 'weather', x: 4, y: 2, w: 4, h: 2 },         // 中：天气
      { i: 'soil', x: 8, y: 2, w: 4, h: 2 },            // 中：土壤
      { i: 'light', x: 0, y: 4, w: 2, h: 2 },           // 小：光照
      { i: 'co2', x: 2, y: 4, w: 2, h: 2 },             // 小：CO2
      { i: 'fertility', x: 4, y: 4, w: 2, h: 2 },       // 小：肥力
      { i: 'nitrogen', x: 6, y: 4, w: 2, h: 2 },        // 小：氮
      { i: 'phosphorus', x: 8, y: 4, w: 2, h: 2 },      // 小：磷
      { i: 'potassium', x: 10, y: 4, w: 2, h: 2 },      // 小：钾
      { i: 'spectral', x: 0, y: 6, w: 4, h: 4 },        // 大：光谱
      { i: 'membership', x: 4, y: 6, w: 4, h: 2 },       // 中：会员
      { i: 'weather-forecast', x: 8, y: 6, w: 4, h: 4 }  // 大：天气预报
    ] as Layout[]
  },

  // 紧凑视图 - 小组件优先
  compact: {
    name: '紧凑视图',
    description: '最大化信息密度',
    layout: [
      { i: 'temperature', x: 0, y: 0, w: 4, h: 2 },     // 中：温度
      { i: 'humidity', x: 4, y: 0, w: 4, h: 2 },        // 中：湿度
      { i: 'weather', x: 8, y: 0, w: 4, h: 2 },         // 中：天气
      { i: 'light', x: 0, y: 2, w: 2, h: 2 },           // 小：光照
      { i: 'co2', x: 2, y: 2, w: 2, h: 2 },             // 小：CO2
      { i: 'fertility', x: 4, y: 2, w: 2, h: 2 },       // 小：肥力
      { i: 'nitrogen', x: 6, y: 2, w: 2, h: 2 },        // 小：氮
      { i: 'phosphorus', x: 8, y: 2, w: 2, h: 2 },      // 小：磷
      { i: 'potassium', x: 10, y: 2, w: 2, h: 2 },      // 小：钾
      { i: 'soil', x: 0, y: 4, w: 4, h: 2 },            // 中：土壤
      { i: 'heatmap', x: 4, y: 4, w: 4, h: 4 },      // 大：环境时段热力图
      { i: 'spectral', x: 8, y: 4, w: 4, h: 4 },        // 大：光谱
      { i: 'membership', x: 0, y: 6, w: 4, h: 2 },       // 中：会员
      { i: 'weather-forecast', x: 4, y: 8, w: 4, h: 4 }  // 大：天气预报
    ] as Layout[]
  },

  // 数据优先 - 大组件优先
  dataFirst: {
    name: '数据优先',
    description: '突出显示关键数据分析',
    layout: [
      { i: 'heatmap', x: 0, y: 0, w: 4, h: 4 },      // 大：环境时段热力图
      { i: 'spectral', x: 4, y: 0, w: 4, h: 4 },        // 大：光谱
      { i: 'temperature', x: 8, y: 0, w: 4, h: 2 },     // 中：温度
      { i: 'humidity', x: 8, y: 2, w: 4, h: 2 },        // 中：湿度
      { i: 'weather', x: 0, y: 4, w: 4, h: 2 },         // 中：天气
      { i: 'soil', x: 4, y: 4, w: 4, h: 2 },            // 中：土壤
      { i: 'light', x: 8, y: 4, w: 2, h: 2 },           // 小：光照
      { i: 'co2', x: 10, y: 4, w: 2, h: 2 },            // 小：CO2
      { i: 'fertility', x: 0, y: 6, w: 2, h: 2 },       // 小：肥力
      { i: 'nitrogen', x: 2, y: 6, w: 2, h: 2 },        // 小：氮
      { i: 'phosphorus', x: 4, y: 6, w: 2, h: 2 },      // 小：磷
      { i: 'potassium', x: 6, y: 6, w: 2, h: 2 },       // 小：钾
      { i: 'membership', x: 8, y: 6, w: 4, h: 2 },      // 中：会员
      { i: 'weather-forecast', x: 0, y: 8, w: 4, h: 4 }  // 大：天气预报
    ] as Layout[]
  },

  // 监控大屏 - 中等组件为主
  monitor: {
    name: '监控大屏',
    description: '适合大屏幕监控显示',
    layout: [
      { i: 'temperature', x: 0, y: 0, w: 4, h: 2 },     // 中：温度
      { i: 'humidity', x: 4, y: 0, w: 4, h: 2 },        // 中：湿度
      { i: 'weather', x: 8, y: 0, w: 4, h: 2 },         // 中：天气
      { i: 'soil', x: 0, y: 2, w: 4, h: 2 },            // 中：土壤
      { i: 'heatmap', x: 4, y: 2, w: 4, h: 4 },      // 大：环境时段热力图
      { i: 'spectral', x: 8, y: 2, w: 4, h: 4 },        // 大：光谱
      { i: 'light', x: 0, y: 4, w: 2, h: 2 },           // 小：光照
      { i: 'co2', x: 2, y: 4, w: 2, h: 2 },             // 小：CO2
      { i: 'fertility', x: 0, y: 6, w: 2, h: 2 },       // 小：肥力
      { i: 'nitrogen', x: 2, y: 6, w: 2, h: 2 },        // 小：氮
      { i: 'phosphorus', x: 4, y: 6, w: 2, h: 2 },      // 小：磷
      { i: 'potassium', x: 6, y: 6, w: 2, h: 2 },       // 小：钾
      { i: 'membership', x: 8, y: 6, w: 4, h: 2 },      // 中：会员
      { i: 'weather-forecast', x: 0, y: 8, w: 4, h: 4 }  // 大：天气预报
    ] as Layout[]
  },

  // 环境监测 - 环境数据优先
  environment: {
    name: '环境监测',
    description: '专注环境参数监控',
    layout: [
      { i: 'temperature', x: 0, y: 0, w: 4, h: 2 },     // 中：温度
      { i: 'humidity', x: 4, y: 0, w: 4, h: 2 },        // 中：湿度
      { i: 'weather', x: 8, y: 0, w: 4, h: 2 },         // 中：天气
      { i: 'light', x: 0, y: 2, w: 2, h: 2 },           // 小：光照
      { i: 'co2', x: 2, y: 2, w: 2, h: 2 },             // 小：CO2
      { i: 'heatmap', x: 4, y: 2, w: 4, h: 4 },      // 大：环境时段热力图
      { i: 'spectral', x: 8, y: 2, w: 4, h: 4 },        // 大：光谱
      { i: 'soil', x: 0, y: 4, w: 4, h: 2 },            // 中：土壤
      { i: 'fertility', x: 0, y: 6, w: 2, h: 2 },       // 小：肥力
      { i: 'nitrogen', x: 2, y: 6, w: 2, h: 2 },        // 小：氮
      { i: 'phosphorus', x: 4, y: 6, w: 2, h: 2 },      // 小：磷
      { i: 'potassium', x: 6, y: 6, w: 2, h: 2 },       // 小：钾
      { i: 'membership', x: 8, y: 6, w: 4, h: 2 },      // 中：会员
      { i: 'weather-forecast', x: 0, y: 8, w: 4, h: 4 }  // 大：天气预报
    ] as Layout[]
  },

  // 土壤监测 - 土壤数据优先
  soil: {
    name: '土壤监测',
    description: '专注土壤健康分析',
    layout: [
      { i: 'soil', x: 0, y: 0, w: 4, h: 2 },            // 中：土壤
      { i: 'fertility', x: 4, y: 0, w: 2, h: 2 },       // 小：肥力
      { i: 'nitrogen', x: 6, y: 0, w: 2, h: 2 },        // 小：氮
      { i: 'phosphorus', x: 8, y: 0, w: 2, h: 2 },      // 小：磷
      { i: 'potassium', x: 10, y: 0, w: 2, h: 2 },      // 小：钾
      { i: 'heatmap', x: 0, y: 2, w: 4, h: 4 },      // 大：环境时段热力图
      { i: 'spectral', x: 4, y: 2, w: 4, h: 4 },        // 大：光谱
      { i: 'temperature', x: 8, y: 2, w: 4, h: 2 },     // 中：温度
      { i: 'humidity', x: 8, y: 4, w: 4, h: 2 },        // 中：湿度
      { i: 'weather', x: 0, y: 6, w: 4, h: 2 },         // 中：天气
      { i: 'light', x: 4, y: 6, w: 2, h: 2 },           // 小：光照
      { i: 'co2', x: 6, y: 6, w: 2, h: 2 },             // 小：CO2
      { i: 'membership', x: 8, y: 6, w: 4, h: 2 },      // 中：会员
      { i: 'weather-forecast', x: 0, y: 8, w: 4, h: 4 }  // 大：天气预报
    ] as Layout[]
  }
}

// 获取组件的尺寸配置
export function getWidgetSize(widgetId: string): WidgetSize {
  const config = WIDGET_CONFIGS.find(w => w.id === widgetId)
  return config?.size || 'medium'
}

// 获取组件的网格尺寸
export function getWidgetDimensions(size: WidgetSize) {
  return WIDGET_DIMENSIONS[size]
}

// 根据优先级排序组件
export function sortWidgetsByPriority(widgets: WidgetConfig[]): WidgetConfig[] {
  return [...widgets].sort((a, b) => b.priority - a.priority)
}

// 生成自适应布局
export function generateAdaptiveLayout(
  availableWidgets: string[], 
  containerWidth: number = 12
): Layout[] {
  const layout: Layout[] = []
  let currentX = 0
  let currentY = 0
  let maxRowHeight = 0

  // 按优先级排序
  const sortedConfigs = sortWidgetsByPriority(
    WIDGET_CONFIGS.filter(w => availableWidgets.includes(w.id))
  )

  sortedConfigs.forEach(config => {
    const dimensions = getWidgetDimensions(config.size)
    
    // 检查是否需要换行
    if (currentX + dimensions.w > containerWidth) {
      currentX = 0
      currentY += maxRowHeight
      maxRowHeight = 0
    }

    layout.push({
      i: config.id,
      x: currentX,
      y: currentY,
      w: dimensions.w,
      h: dimensions.h
    })

    currentX += dimensions.w
    maxRowHeight = Math.max(maxRowHeight, dimensions.h)
  })

  return layout
}