/**
 * 🍓 A2UI 协议封装（基于 @ant-design/x-card v0.9）
 *
 * 所有业务卡片必须使用本文件提供的统一 schema 和组件实现，
 * 以保证 A2UI 协议一致性。
 *
 * 用法：
 *   1. 引入本文件
 *   2. 使用 buildCommands() 构建 A2UICommand_v0_9[]
 *   3. 用 <BerryXCard /> 渲染（自动带兜底）
 */

import type { A2UICommand_v0_9, ActionPayload, Catalog } from '@ant-design/x-card'

// ===== 统一 Catalog ID =====
export const BERRY_CATALOG_ID = 'berry-realm-catalog-v1'

// ===== 统一组件名 =====
export const BERRY_COMPONENTS = {
  // 布局
  Column: 'Column',
  Row: 'Row',
  Stack: 'Stack',
  // 容器
  Card: 'Card',
  CardHeader: 'CardHeader',
  CardBody: 'CardBody',
  CardFooter: 'CardFooter',
  // 数据展示
  Metric: 'Metric',
  MetricGrid: 'MetricGrid',
  StatusBadge: 'StatusBadge',
  // 交互
  ActionButton: 'ActionButton',
  DeviceToggle: 'DeviceToggle',
  // 业务
  TaskList: 'TaskList',
  TaskItem: 'TaskItem',
  DeviceCard: 'DeviceCard',
  EnvironmentGauge: 'EnvironmentGauge',
  ScheduleItem: 'ScheduleItem',
} as const

// ===== 统一 Catalog Schema =====
export const berryCatalog: Catalog = {
  catalogId: BERRY_CATALOG_ID,
  components: {
    // ----- 布局 -----
    Column: {
      type: 'object',
      properties: { gap: { type: 'number' } },
      required: [] as string[],
    },
    Row: {
      type: 'object',
      properties: { gap: { type: 'number' } },
      required: [] as string[],
    },
    Stack: {
      type: 'object',
      properties: { direction: { type: 'string' }, gap: { type: 'number' } },
      required: [] as string[],
    },

    // ----- 容器 -----
    Card: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        domain: { type: 'string' },  // 业务域（决定色系）
        title: { type: 'string' },
        subtitle: { type: 'string' },
        collapsible: { type: 'boolean' },
      },
      required: ['id'] as string[],
    },
    CardHeader: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        icon: { type: 'string' },
        status: { type: 'string' },
      },
      required: ['title'] as string[],
    },
    CardBody: {
      type: 'object',
      properties: {},
      required: [] as string[],
    },
    CardFooter: {
      type: 'object',
      properties: {},
      required: [] as string[],
    },

    // ----- 数据展示 -----
    Metric: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        value: { type: 'string' },
        unit: { type: 'string' },
        icon: { type: 'string' },
        color: { type: 'string' },
        trend: { type: 'string' },
      },
      required: ['title', 'value'] as string[],
    },
    MetricGrid: {
      type: 'object',
      properties: { columns: { type: 'number' } },
      required: [] as string[],
    },
    StatusBadge: {
      type: 'object',
      properties: {
        status: { type: 'string' },  // success | processing | warning | error | pending
        text: { type: 'string' },
      },
      required: ['status', 'text'] as string[],
    },

    // ----- 交互 -----
    ActionButton: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        action: { type: 'string' },
        context: { type: 'object' },
        type: { type: 'string' },   // primary | default | danger
        icon: { type: 'string' },
      },
      required: ['label', 'action'] as string[],
    },
    DeviceToggle: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        deviceName: { type: 'string' },
        isOn: { type: 'boolean' },
        icon: { type: 'string' },
      },
      required: ['deviceId', 'deviceName'] as string[],
    },

    // ----- 业务 -----
    TaskList: {
      type: 'object',
      properties: { tasks: { type: 'array', items: { type: 'object' } } },
      required: ['tasks'] as string[],
    },
    TaskItem: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        status: { type: 'string' },
        items: { type: 'array', items: { type: 'object' } },
      },
      required: ['title', 'status'] as string[],
    },
    DeviceCard: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string' },
        status: { type: 'string' },
        value: { type: 'string' },
        unit: { type: 'string' },
      },
      required: ['deviceId', 'name'] as string[],
    },
    EnvironmentGauge: {
      type: 'object',
      properties: {
        metric: { type: 'string' },
        value: { type: 'number' },
        min: { type: 'number' },
        max: { type: 'number' },
        unit: { type: 'string' },
        thresholds: { type: 'object' },
      },
      required: ['metric', 'value'] as string[],
    },
    ScheduleItem: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        cron: { type: 'string' },
        nextRun: { type: 'string' },
        enabled: { type: 'boolean' },
      },
      required: ['id', 'name'] as string[],
    },
  },
}

// ===== 命令构建器 =====
export function buildCommands(
  surfaceId: string,
  components: Array<{ id: string; component: string; [key: string]: any }>,
  rootChildren: string[]
): A2UICommand_v0_9[] {
  return [
    { version: 'v0.9', createSurface: { surfaceId, catalogId: BERRY_CATALOG_ID } },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId,
        components: [
          { id: 'root', component: 'Column', children: rootChildren },
          ...components,
        ],
      },
    },
  ]
}

// ===== Action 分发器 =====
export type BerryActionHandler = (payload: ActionPayload) => void

/**
 * 创建统一的 action 处理器
 */
export function createActionDispatcher(handlers: Record<string, BerryActionHandler>) {
  return (payload: ActionPayload) => {
    const handler = handlers[payload.name]
    if (handler) {
      handler(payload)
    } else {
      console.warn(`[A2UI] No handler for action: ${payload.name}`)
    }
  }
}
