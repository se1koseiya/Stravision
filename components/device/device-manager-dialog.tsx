"use client";

/**
 * 设备管理弹窗（DeviceManagerDialog）
 *
 * 【背景】/device-control 页面的设备卡片读的是 `/api/devices` 设备注册表，
 * 但注册表的管理界面此前只有 admin 后台的一张 antd 表格（components/admin/device-manager.tsx），
 * 桌面端本地用户要先跳 /admin 才能增删设备。本弹窗把「设备管理」搬到页面内。
 *
 * 【版式】与 AI 助手设置弹窗（components/ai-settings-dialog.tsx）**完全同源**：
 * 共用 `@/components/settings/settings-modal-ui` 的版式原子（Row/Card/GroupTitle/GreenSwitch）
 * 与主题作用域 CSS 变量（--set-*），左栏 196px 导航 + 右栏标题/分组小标题/白卡片。
 * 🚨 圆角/背景写在 `styles.container`（.ant-modal-container，antd v6 视觉层），
 *    并把外层 `.ant-modal` 清成透明，否则白底会从圆角外漏一圈。
 *
 * 【全局同步】任何写操作成功后：
 *   1. `window.dispatchEvent('berry:devices-changed')` → DeviceProvider.refreshDevices()
 *      → device-control 卡片 / 设备分组 / 统计 / 其他消费方全部刷新；
 *   2. DeviceProvider 的注册表是全局单例，CopilotSidebar（AI 助手）也读同一份快照，
 *      因此 AI 助手看到的设备清单与弹窗同源。
 *
 * 【入口】
 *   · /device-control 页「设备管理」按钮
 *   · 任意位置 `window.dispatchEvent(new CustomEvent('berry:open-device-manager'))`
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { AutoComplete, Button, Card as AntCard, ColorPicker, ConfigProvider, Empty, Input, InputNumber, Modal, Popconfirm, Spin, Tag, Typography, theme as antdTheme } from "antd"
import { toast } from "@/lib/ui/feedback"
import {
  IconChartLine,
  IconClose,
  IconCloudStorage,
  IconCompass,
  IconCpu,
  IconDelete,
  IconEdit,
  IconFan,
  IconLight,
  IconLink,
  IconPlus,
  IconRefresh,
  IconSignal,
  IconSun,
  IconThermometer,
  IconVideo,
  IconWater,
  IconWind,
} from "@/components/icon";
import type { IconProps } from "@/components/icon";
import {
  Card,
  Dropdown,
  GreenSwitch,
  GroupTitle,
  Row,
  SettingsModalStyle,
} from "@/components/settings/settings-modal-ui";
import {
  useDeviceContext,
  type DeviceType,
  type RegistryDevice,
} from "@/lib/contexts/device-context";
// 通用硬件接入（第三方设备）：连接配置 / 接入向导 / 设备详情，全部复用设备管理弹窗的版式
import { ConnectionForm, type ConnectionView } from "@/components/device-access/connection-form";
import { DeviceWizard } from "@/components/device-access/device-wizard";
import { DeviceDetail, type DeviceView } from "@/components/device-access/device-detail";
import { ACCESS_LOCAL_CSS, ACCESS_RADIUS } from "@/components/device-access/access-modal";
import type { ProtocolMeta } from "@/lib/devices/protocols/types";
// Copilot 生成的接入草稿：走总线投递，本弹窗消费后灌进接入向导
import {
  consumeAccessDraft,
  DEVICE_ACCESS_DRAFT_EVENT,
  peekAccessDraft,
  type DeviceAccessDraft,
} from "@/lib/devices/access-draft";
import {
  registerFormHost,
  type FormSnapshot,
  type PatchOutcome,
} from "@/lib/devices/form-state";

const { Text } = Typography;
const { TextArea } = Input;

/** 全局打开事件名（页面按钮 / 任意组件都可广播） */
export const OPEN_DEVICE_MANAGER_EVENT = "berry:open-device-manager";
/** 设备注册表变更广播（DeviceProvider 监听后重新拉取） */
export const DEVICES_CHANGED_EVENT = "berry:devices-changed";

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

const TYPE_LABEL: Record<DeviceType, string> = {
  relay: "继电器",
  sensor: "传感器",
  camera: "摄像头",
  stepper: "步进电机",
};

const TYPE_TAG_COLOR: Record<DeviceType, string> = {
  relay: "blue",
  sensor: "green",
  camera: "purple",
  stepper: "orange",
};

/** 通用接入协议标签（第三方硬件） */
const GENERIC_PROTOCOL_LABEL: Record<string, string> = {
  mqtt: "MQTT",
  http: "HTTP",
  modbus_tcp: "Modbus",
};

const TYPE_OPTIONS = (Object.keys(TYPE_LABEL) as DeviceType[]).map((v) => ({
  value: v,
  label: TYPE_LABEL[v],
}));

/**
 * 设备身份色（图标底色 / 卡片高亮色）。
 * 🚨 默认值必须是品牌绿，预设取自设计系统 iOS accents——此前默认是 antd 蓝 #059669、
 * 预设是 antd 调色板，导致注册表里全是蓝/紫，与页面绿色体系打架（用户反馈「配色不统一」）。
 */
const DEVICE_DEFAULT_COLOR = "#059669"
const DEVICE_COLOR_PRESETS = [
  { label: "品牌绿", colors: ["#059669", "#40C8E0", "#0A84FF"] },
  { label: "暖色", colors: ["#52525B", "#71717A", "#BF5AF2"] },
  { label: "中性", colors: ["#5856D6", "#8E8E93"] },
]

/** 可选图标（键名与设备注册表 `icon` 字段一致，各页面按该键解析组件） */
export const ICON_OPTIONS = [
  { value: "IconWater", label: "水滴 / 水泵" },
  { value: "IconFan", label: "风扇 / 通风" },
  { value: "IconLight", label: "补光灯 / 照明" },
  { value: "IconSun", label: "太阳 / 光照" },
  { value: "IconThermometer", label: "温度 / 环境" },
  { value: "IconVideo", label: "摄像头 / 视频" },
  { value: "IconCompass", label: "云台 / 方位" },
  { value: "IconChartLine", label: "传感器 / 曲线" },
  { value: "IconWind", label: "风 / 气流" },
  { value: "IconCloudStorage", label: "云端 / 存储" },
  { value: "IconSignal", label: "信号 / 通信" },
  { value: "IconCpu", label: "通用 / 芯片" },
];

const CATEGORY_PRESETS = ["灌溉", "通风", "照明", "环境监测", "视频监控", "云台"];

/** 设备图标名 → 组件（未命中回退 IconCpu；兼容 "Cpu" 这类缺前缀的旧值） */
const DEVICE_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  IconWater,
  IconFan,
  IconLight,
  IconSun,
  IconThermometer,
  IconVideo,
  IconCompass,
  IconChartLine,
  IconWind,
  IconCloudStorage,
  IconSignal,
  IconCpu,
};

/**
 * legacy 图标名 → 现用 `Icon*` 名。
 * 🚨 早期注册表里存的是 lucide 原名（Droplets / Sun / Video / Compass），
 * 与 ICON_OPTIONS 的 `Icon*` 白名单对不上 → `resolveDeviceIcon` 一律回退成通用 CPU 图标：
 * 页面上 5 台设备画着同一个芯片图标、颜色却各不相同，这正是「UI 不细致」的观感来源。
 * 这里做一次大小写不敏感的兼容映射，老数据不迁移也能渲染出正确图标。
 */
const LEGACY_ICON_ALIASES: Record<string, string> = {
  water: "IconWater", droplet: "IconWater", droplets: "IconWater", pump: "IconWater",
  fan: "IconFan", blower: "IconFan",
  light: "IconLight", lightbulb: "IconLight", lamp: "IconLight",
  sun: "IconSun", sunny: "IconSun", sunmedium: "IconSun",
  thermometer: "IconThermometer", temperature: "IconThermometer", thermo: "IconThermometer",
  video: "IconVideo", camera: "IconVideo", cctv: "IconVideo",
  compass: "IconCompass", ptz: "IconCompass",
  wind: "IconWind", airflow: "IconWind",
  cloud: "IconCloudStorage", cloudstorage: "IconCloudStorage", storage: "IconCloudStorage",
  signal: "IconSignal", wifi: "IconSignal", network: "IconSignal",
  chartline: "IconChartLine", activity: "IconChartLine", linechart: "IconChartLine",
  cpu: "IconCpu", chip: "IconCpu", mcu: "IconCpu",
};

/** 把任意历史写法归一成 ICON_OPTIONS 里的规范名（`Icon*`，未命中 → IconCpu） */
export function normalizeDeviceIconName(name?: string | null): string {
  if (!name) return "IconCpu";
  const key = String(name).trim();
  if (!key) return "IconCpu";
  if (DEVICE_ICON_MAP[key]) return key;
  const cap = `Icon${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  if (DEVICE_ICON_MAP[cap]) return cap;
  const prefixed = `Icon${key}`;
  if (DEVICE_ICON_MAP[prefixed]) return prefixed;
  // legacy：去掉可能残留的 "Icon" 前缀后转小写查别名表
  const alias = LEGACY_ICON_ALIASES[key.toLowerCase().replace(/^icon/, "")];
  return alias || "IconCpu";
}

export function resolveDeviceIcon(name?: string | null): React.ComponentType<IconProps> {
  return DEVICE_ICON_MAP[normalizeDeviceIconName(name)] || IconCpu;
}

/**
 * legacy 身份色 → 设计系统默认色。
 * 🚨 早期默认值写的是 antd 调色板（蓝 #1890ff、紫 #722ed1…），存量注册表里 5 台设备全是这套，
 * 于是页面同时出现 antd 蓝 + antd 紫 + 品牌绿，就是用户看到的「配色不统一」。
 * 这里把「旧 antd 默认色」视为未设置，一律回落到品牌绿——不迁移数据也能立刻统一。
 * 用户若确实想要蓝色，在「设备管理」里用新的预设重新选一次即可（选完就不在旧默认色表里了）。
 */
const LEGACY_DEFAULT_COLORS: Record<string, string> = {
  "#1890ff": DEVICE_DEFAULT_COLOR, // antd blue-6（旧默认）
  "#722ed1": DEVICE_DEFAULT_COLOR, // antd purple-6
  "#13c2c2": DEVICE_DEFAULT_COLOR, // antd cyan-6
  "#52c41a": DEVICE_DEFAULT_COLOR, // antd green-6
  "#faad14": DEVICE_DEFAULT_COLOR, // antd gold-6
  "#f5222d": DEVICE_DEFAULT_COLOR, // antd red-6
  "#eb2f96": DEVICE_DEFAULT_COLOR, // antd magenta-6
  "#2f54eb": DEVICE_DEFAULT_COLOR, // antd geekblue-6
  "#fa8c16": DEVICE_DEFAULT_COLOR, // antd orange-6
};

/** 解析设备身份色（未设置 / 旧 antd 默认色 → 品牌绿） */
export function resolveDeviceColor(color?: string | null): string {
  if (!color) return DEVICE_DEFAULT_COLOR;
  const key = String(color).trim().toLowerCase();
  if (LEGACY_DEFAULT_COLORS[key]) return LEGACY_DEFAULT_COLORS[key];
  // 兼容 rgb()/rgba() 形式的旧值（ColorPicker 早期版本写过）
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(key);
  if (m) {
    const hex = "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    return LEGACY_DEFAULT_COLORS[hex] || hex;
  }
  return String(color).trim();
}


/* ------------------------------------------------------------------ */
/* 草稿                                                                */
/* ------------------------------------------------------------------ */

interface Draft {
  id: number | null;
  name: string;
  type: DeviceType;
  category: string;
  node_id: string;
  subscribe_topic: string;
  publish_topic: string;
  icon: string;
  color: string;
  is_critical: boolean;
  is_enabled: boolean;
  sort_order: number;
  configText: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  name: "",
  type: "relay",
  category: "",
  node_id: "",
  subscribe_topic: "",
  publish_topic: "",
  icon: "IconCpu",
  color: DEVICE_DEFAULT_COLOR,
  is_critical: false,
  is_enabled: true,
  sort_order: 0,
  configText: "{}",
};

function draftFromDevice(d: RegistryDevice): Draft {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    category: d.category || "",
    node_id: d.node_id || "",
    subscribe_topic: d.subscribe_topic || "",
    publish_topic: d.publish_topic || "",
    icon: normalizeDeviceIconName(d.icon),
    color: resolveDeviceColor(d.color),
    is_critical: !!d.is_critical,
    is_enabled: !!d.is_enabled,
    sort_order: d.sort_order ?? 0,
    configText: JSON.stringify(d.config || {}, null, 2),
  };
}

/* ------------------------------------------------------------------ */
/* 小工具                                                              */
/* ------------------------------------------------------------------ */

function formatTime(ts: number | null | undefined): string {
  if (!ts || isNaN(new Date(ts).getTime())) return "—";
  const d = new Date(ts < 1e12 ? ts * 1000 : ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 第三方连接的端点摘要（列表里只展示最关键的一行） */
function genericEndpoint(conn: ConnectionView): string {
  const cfg = (conn.config || {}) as Record<string, unknown>;
  if (conn.protocol === "mqtt") return String(cfg.url || "未配置 broker");
  if (conn.protocol === "http") return String(cfg.baseUrl || "未配置服务地址");
  if (conn.protocol === "modbus_tcp") return `${cfg.host || "?"}:${cfg.port || 502}`;
  return "—";
}

/**
 * 渲染设备图标节点。
 * 🚨 故意返回 JSX 而不是「解析出的组件引用」：把组件赋给大写变量再在 render 里实例化
 * 会触发 react-hooks/static-components（组件在渲染期创建，状态会被重置）。
 */
function renderDeviceIcon(
  name: string | null | undefined,
  props?: { size?: number; strokeWidth?: number; style?: React.CSSProperties }
) {
  const Icon = resolveDeviceIcon(name);
  return <Icon {...(props || {})} />;
}

/** 设备图标方块（与 admin 设备表格、device-control 卡片同一套视觉） */
function DeviceIconBox({ icon, color, box = 28 }: { icon?: string | null; color?: string; box?: number }) {
  return (
    <div
      style={{
        width: box,
        height: box,
        borderRadius: ACCESS_RADIUS.control,
        background: color || DEVICE_DEFAULT_COLOR,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {renderDeviceIcon(icon, { size: Math.max(12, Math.floor(box * 0.55)), strokeWidth: 2 })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 主组件                                                              */
/* ------------------------------------------------------------------ */

type SectionKey = "list" | "create" | "connection";

interface NavGroup {
  title: string;
  items: Array<{ key: SectionKey; label: string; icon: React.ReactNode }>;
}

export interface DeviceManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 打开时定位的分区（默认「设备列表」） */
  initialSection?: SectionKey;
  /** 监听全局 `berry:open-device-manager` 事件自动打开（默认开） */
  listenGlobalOpen?: boolean;
  /** 是否允许增删改；不传则内部按 /api/auth/me 的角色判定 */
  canManage?: boolean;
}

export function DeviceManagerDialog({
  open,
  onOpenChange,
  initialSection = "list",
  listenGlobalOpen = true,
  canManage,
}: DeviceManagerDialogProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  /**
   * 🚨 列表读 `allDevices`（完整注册表，含已禁用），不是 `devices`（仅启用）。
   * 开关的语义是「临时禁用」：关掉后那台设备必须继续留在列表里（变灰 + 已禁用标签），
   * 并且能原地重新启用。读 `devices` 会导致关掉开关的瞬间该行消失 = 看起来像被删除了。
   */
  const { allDevices, devices, devicesLoading, connectionStatus, refreshDevices } = useDeviceContext();
  const registryDevices = allDevices ?? devices;

  const [section, setSection] = useState<SectionKey>(initialSection);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (open) setSection(initialSection);
  }, [open, initialSection]);

  /* ── 权限：写操作与 /api/devices 的 admin-only 规则保持一致 ── */
  useEffect(() => {
    if (canManage !== undefined || roleLoaded) return;
    let alive = true;
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        const role = data?.user?.role;
        setIsAdmin(role === "admin" || role === "super_admin");
      } catch {
        if (alive) setIsAdmin(false);
      } finally {
        if (alive) setRoleLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [canManage, roleLoaded]);

  const manage = canManage ?? isAdmin;

  /** 注册表变更 → 全局刷新（DeviceProvider 收到事件后重拉 /api/devices） */
  const broadcastChange = useCallback(() => {
    window.dispatchEvent(new CustomEvent(DEVICES_CHANGED_EVENT));
  }, []);

  /* ── 通用接入（第三方硬件）：连接 / 设备 / 协议元数据 ──
     与专属硬件（/api/devices）分离存储：这里的设备 access_mode='generic'，
     能力由物模型定义，不占用 relay/sensor 的内置协议实现。 */
  const [genericDevices, setGenericDevices] = useState<DeviceView[]>([]);
  const [genericLoading, setGenericLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [protocols, setProtocols] = useState<ProtocolMeta[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [connFormOpen, setConnFormOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<ConnectionView | null>(null);
  const [detailDevice, setDetailDevice] = useState<DeviceView | null>(null);
  const [testingConnId, setTestingConnId] = useState<number | null>(null);
  const [togglingGenericId, setTogglingGenericId] = useState<number | null>(null);
  /** Copilot 草稿：向导预填用；等连接建好后再打开（见 handleConnSaved） */
  const [wizardDraft, setWizardDraft] = useState<DeviceAccessDraft | null>(null);
  /** 草稿里没有可复用的连接时，先把这条连接建出来 */
  const [connPreset, setConnPreset] = useState<{
    name?: string;
    protocol?: string;
    description?: string;
    config?: Record<string, unknown>;
    allow_private_network?: boolean;
  } | null>(null);

  const loadGeneric = useCallback(async () => {
    setGenericLoading(true);
    try {
      const [dRes, cRes, pRes] = await Promise.all([
        fetch("/api/device-platform/devices", { cache: "no-store" }),
        fetch("/api/device-platform/connections", { cache: "no-store" }),
        fetch("/api/device-platform/protocols", { cache: "no-store" }),
      ]);
      const [dData, cData, pData] = await Promise.all([
        dRes.json().catch(() => ({})),
        cRes.json().catch(() => ({})),
        pRes.json().catch(() => ({})),
      ]);
      if (dRes.ok) setGenericDevices(dData.devices || []);
      if (cRes.ok) setConnections(cData.connections || []);
      if (pRes.ok) setProtocols(pData.protocols || []);
    } catch (e) {
      console.error("[DeviceManagerDialog GENERIC]", e);
    } finally {
      setGenericLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadGeneric();
  }, [open, loadGeneric]);

  /** 新增第三方设备：没有连接先建连接（连接 = 平台与硬件的通信通道） */
  const openGenericWizard = useCallback(() => {
    if (connections.length === 0) {
      setEditingConn(null);
      setConnFormOpen(true);
      return;
    }
    setWizardOpen(true);
  }, [connections.length]);

  const handleToggleGeneric = useCallback(
    async (device: DeviceView, enabled: boolean) => {
      setTogglingGenericId(device.id);
      try {
        const res = await fetch(`/api/device-platform/devices/${device.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_enabled: enabled }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        toast.success(enabled ? `已启用「${device.name}」` : `已临时禁用「${device.name}」，设备仍在列表中`);
        void loadGeneric();
        broadcastChange();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "更新失败");
      } finally {
        setTogglingGenericId(null);
      }
    },
    [loadGeneric, broadcastChange]
  );

  const handleDeleteGeneric = useCallback(
    async (device: DeviceView) => {
      try {
        const res = await fetch(`/api/device-platform/devices/${device.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        toast.success(`已移除「${device.name}」`);
        void loadGeneric();
        broadcastChange();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "移除失败");
      }
    },
    [loadGeneric, broadcastChange]
  );

  const handleTestConnection = useCallback(
    async (conn: ConnectionView) => {
      setTestingConnId(conn.id);
      try {
        const res = await fetch(`/api/device-platform/connections/${conn.id}/test`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (data.ok) toast.success(data.detail || "连接正常");
        else toast.error(data.detail || data.error || "连接失败");
        void loadGeneric();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "测试失败");
      } finally {
        setTestingConnId(null);
      }
    },
    [loadGeneric]
  );

  const handleDeleteConnection = useCallback(
    async (conn: ConnectionView) => {
      try {
        const res = await fetch(`/api/device-platform/connections/${conn.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        toast.success("连接已删除");
        void loadGeneric();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "删除失败");
      }
    },
    [loadGeneric]
  );

  /* ── 全局打开事件：任何页面/组件都能唤起本弹窗 ── */
  useEffect(() => {
    if (!listenGlobalOpen) return;
    const handler = () => onOpenChange(true);
    window.addEventListener(OPEN_DEVICE_MANAGER_EVENT, handler);
    return () => window.removeEventListener(OPEN_DEVICE_MANAGER_EVENT, handler);
  }, [listenGlobalOpen, onOpenChange]);

  /**
   * 消费一份 Copilot 草稿：打开接入向导（或先建连接）。
   *
   * 🚨 不挂 `listenGlobalOpen` 门控：草稿是「用户刚在对话里要的东西」，
   *    必须在任何实例上都能被消费，否则 AI 说「已经帮你填好了」而界面没反应。
   * 🚨 连接不存在时先弹连接表单（草稿里的 Broker 地址等已预填），
   *    保存成功后再带着新连接 id 打开向导 —— 不能直接打开向导，
   *    因为「接入连接」是必填项，用户会卡在一个自己没有的连接上。
   * 🚨 进来先 `loadGeneric()`：草稿可能比弹窗首次打开还早到，
   *    protocols 还是空的就会出现「协议区一片空白、参数填不进去」。
   */
  const applyAccessDraft = useCallback(
    (d: DeviceAccessDraft) => {
      onOpenChange(true);
      setSection("list");
      void loadGeneric();

      const wantId = d.connection?.id ?? null;
      const matched =
        (wantId ? connections.find((c) => c.id === wantId) : undefined) ||
        (d.connection?.protocol
          ? connections.find(
              (c) => c.protocol === d.connection?.protocol && (!d.connection?.name || c.name === d.connection.name)
            ) || connections.find((c) => c.protocol === d.connection?.protocol)
          : undefined);

      setWizardDraft(d);
      if (matched || !d.connection || wantId) {
        // 复用已有连接（或草稿没提连接，用户自己在向导里选）
        setWizardOpen(true);
        return;
      }
      // 需要新建连接：先把连接建出来
      setEditingConn(null);
      setConnPreset({
        name: d.connection.name,
        protocol: d.connection.protocol,
        description: d.connection.description,
        config: d.connection.config,
        allow_private_network: d.connection.allow_private_network,
      });
      setConnFormOpen(true);
    },
    [connections, loadGeneric, onOpenChange]
  );

  useEffect(() => {
    const onDraft = () => {
      const d = consumeAccessDraft();
      if (d) applyAccessDraft(d);
    };
    window.addEventListener(DEVICE_ACCESS_DRAFT_EVENT, onDraft);
    return () => window.removeEventListener(DEVICE_ACCESS_DRAFT_EVENT, onDraft);
  }, [applyAccessDraft]);

  /**
   * 补取：草稿可能在「设备管理弹窗尚未挂载」时投递（用户在别的页面跟 AI 说完就跳过来）。
   * 这时事件早派发完了，只能靠挂载时主动 peek 一次。
   */
  useEffect(() => {
    if (!open) return;
    const pending = peekAccessDraft();
    if (!pending) return;
    consumeAccessDraft();
    applyAccessDraft(pending);
  }, [open, applyAccessDraft]);

  /** 连接保存成功后：若这次是草稿驱动的新建连接，接着打开接入向导 */
  const handleConnectionSaved = useCallback(
    (conn: ConnectionView) => {
      void loadGeneric();
      setConnPreset(null);
      if (!wizardDraft) return;
      setWizardDraft({
        ...wizardDraft,
        connection: { ...(wizardDraft.connection || {}), id: conn.id, name: conn.name, protocol: conn.protocol as never },
      });
      setWizardOpen(true);
    },
    [loadGeneric, wizardDraft]
  );

  /** 统计同样基于完整注册表（否则「禁用 N」永远是 0、总数会随开关漂移） */
  const stats = useMemo(() => {
    const enabled = registryDevices.filter((d) => d.is_enabled).length;
    const byType = (Object.keys(TYPE_LABEL) as DeviceType[]).map((t) => ({
      type: t,
      count: registryDevices.filter((d) => d.type === t).length,
    }));
    return { total: registryDevices.length, enabled, disabled: registryDevices.length - enabled, byType };
  }, [registryDevices]);

  /* ── 表单动作 ── */

  const startCreate = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setSection("create");
  }, []);

  const startEdit = useCallback((d: RegistryDevice) => {
    setDraft(draftFromDevice(d));
    setSection("create");
  }, []);

  const patchDraft = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  /* ── Copilot 表单通道：「新增/编辑专属硬件」这张表 ──
     第三方硬件走 DeviceWizard（注册表里优先级更高），这里只覆盖设备注册表内
     的自绘表单。两张表同时开着时，「当前表单」按优先级取向导，不会互相覆盖。 */
  const registryReadRef = useRef<() => FormSnapshot>(() => ({} as FormSnapshot));
  const registryPatchRef = useRef<(f: Record<string, unknown>) => PatchOutcome>(() => ({
    ok: false,
    applied: [],
    ignored: [],
    issues: [],
    summary: "",
  }));

  /** 模型可写的字段白名单（其余一律忽略并回报，避免它瞎改外观/开关） */
  const REGISTRY_WRITABLE = [
    "name",
    "type",
    "category",
    "node_id",
    "subscribe_topic",
    "publish_topic",
  ];

  registryReadRef.current = (): FormSnapshot => {
    const isRelay = draft.type === "relay";
    const isSensor = draft.type === "sensor";
    const isStepper = draft.type === "stepper";
    const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

    const fields = [
      { key: "name", label: "设备名称", value: str(draft.name), required: true, filled: !!draft.name.trim() },
      {
        key: "type",
        label: "设备类型",
        value: str(draft.type),
        required: true,
        filled: !!draft.type,
        hint: "relay / sensor / camera / stepper；决定 config 结构与可用指令",
      },
      { key: "category", label: "业务分类", value: str(draft.category), required: false, filled: !!draft.category.trim() },
      {
        key: "node_id",
        label: "Node ID",
        value: str(draft.node_id),
        required: false,
        filled: !!draft.node_id.trim(),
        hint: "对应 MQTT node 映射，如 node0601",
      },
      ...(isSensor
        ? [
            {
              key: "subscribe_topic",
              label: "订阅 Topic",
              value: str(draft.subscribe_topic),
              required: false,
              filled: !!draft.subscribe_topic.trim(),
            },
          ]
        : []),
      ...(isRelay || isStepper
        ? [
            {
              key: "publish_topic",
              label: "发布 Topic",
              value: str(draft.publish_topic),
              required: false,
              filled: !!draft.publish_topic.trim(),
            },
          ]
        : []),
    ];

    const missing = fields.filter((f) => f.required && !f.filled).map((f) => f.label);
    if (draft.type === "camera") {
      missing.push('摄像头要在「高级配置」里填 { "stream_url": "rtsp://..." }');
    }

    return {
      kind: "device-registry",
      title: draft.id ? `编辑设备「${draft.name}」` : "新增专属硬件",
      step: null,
      steps: [],
      stepTitle: "",
      fields,
      blocks: [
        {
          key: "configText",
          label: "高级配置（JSON）",
          detail: draft.configText && draft.configText !== "{}" ? draft.configText.slice(0, 300) : "未填写",
        },
      ],
      missing,
      issues: [],
      summary: draft.id
        ? `用户在编辑注册表里的设备「${draft.name}」（类型 ${draft.type}）`
        : `用户在「新增专属硬件」表单，已填 ${fields.filter((f) => f.filled).length}/${fields.length} 个字段`,
      hint: "只补用户没填的业务字段；摄像头类型的视频流地址要写进 configText（高级配置 JSON）。",
    };
  };

  registryPatchRef.current = (fields: Record<string, unknown>): PatchOutcome => {
    const applied: string[] = [];
    const ignored: string[] = [];
    const issues: string[] = [];
    const patch: Partial<Draft> = {};

    for (const k of REGISTRY_WRITABLE) {
      if (!(k in fields)) continue;
      const v = fields[k];
      if (v === undefined || v === null || v === "") {
        ignored.push(k);
        continue;
      }
      if (k === "type") {
        const t = String(v);
        if (!["relay", "sensor", "camera", "stepper"].includes(t)) {
          issues.push(`未知设备类型「${t}」，仅支持 relay / sensor / camera / stepper`);
          continue;
        }
        patch.type = t as DeviceType;
      } else {
        (patch as Record<string, unknown>)[k] = String(v);
      }
      applied.push(k);
    }

    if ("config" in fields && fields.config && typeof fields.config === "object") {
      try {
        const merged = { ...JSON.parse(draft.configText || "{}"), ...(fields.config as object) };
        patch.configText = JSON.stringify(merged, null, 2);
        applied.push("config");
      } catch {
        issues.push("现有「高级配置」不是合法 JSON，请先让用户在界面上修正");
      }
    }

    for (const k of Object.keys(fields)) {
      if (!REGISTRY_WRITABLE.includes(k) && k !== "config") ignored.push(k);
    }

    if (Object.keys(patch).length > 0) patchDraft(patch);

    const ok = applied.length > 0 && issues.length === 0;
    return {
      ok,
      applied,
      ignored,
      issues,
      summary: ok
        ? `已增量填写：${applied.join("、")}（其余字段保持原样）`
        : applied.length === 0
          ? "没有可识别的字段被写入，表单未改动"
          : `写了 ${applied.join("、")}，但有 ${issues.length} 个问题`,
    };
  };

  useEffect(
    () =>
      registerFormHost({
        kind: "device-registry",
        isActive: () => open && section === "create",
        read: () => registryReadRef.current(),
        patch: (f) => registryPatchRef.current(f),
      }),
    [open, section],
  );

  const handleSave = useCallback(async () => {
    const name = draft.name.trim();
    if (!name) {
      toast.warning("请填写设备名称");
      return;
    }

    let configObj: Record<string, unknown> = {};
    const configStr = (draft.configText || "").trim();
    if (configStr) {
      try {
        const parsed = JSON.parse(configStr);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("必须是 JSON 对象");
        }
        configObj = parsed as Record<string, unknown>;
      } catch (e) {
        toast.error(`配置 JSON 不合法：${e instanceof Error ? e.message : ""}`);
        return;
      }
    }

    const payload = {
      name,
      type: draft.type,
      category: draft.category.trim() || "general",
      subscribe_topic: draft.subscribe_topic.trim() || undefined,
      publish_topic: draft.publish_topic.trim() || undefined,
      node_id: draft.node_id.trim() || undefined,
      icon: draft.icon || "IconCpu",
      color: draft.color,
      is_critical: draft.type === "relay" ? !!draft.is_critical : false,
      is_enabled: !!draft.is_enabled,
      sort_order: draft.sort_order ?? 0,
      config: configObj,
    };

    setSaving(true);
    try {
      const url = draft.id ? `/api/devices/${draft.id}` : "/api/devices";
      const res = await fetch(url, {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success(draft.id ? `已更新「${name}」` : `已新增「${name}」`);
      broadcastChange();
      refreshDevices();
      setDraft(EMPTY_DRAFT);
      setSection("list");
    } catch (e) {
      console.error("[DeviceManagerDialog SAVE]", e);
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [draft, broadcastChange, refreshDevices]);

  const handleToggleEnabled = useCallback(
    async (device: RegistryDevice, enabled: boolean) => {
      setTogglingId(device.id);
      try {
        const res = await fetch(`/api/devices/${device.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_enabled: enabled }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        // 文案点明「临时禁用」语义：设备没有被删除，仍在列表里可随时恢复
        toast.success(
          enabled ? `已启用「${device.name}」` : `已临时禁用「${device.name}」，设备仍在列表中，可随时重新启用`
        );
        broadcastChange();
        refreshDevices();
      } catch (e) {
        console.error("[DeviceManagerDialog TOGGLE]", e);
        toast.error(e instanceof Error ? e.message : "更新失败");
      } finally {
        setTogglingId(null);
      }
    },
    [broadcastChange, refreshDevices]
  );

  const handleDelete = useCallback(
    async (device: RegistryDevice) => {
      setRemovingId(device.id);
      try {
        const res = await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        toast.success(`已删除「${device.name}」`);
        if (draft.id === device.id) {
          setDraft(EMPTY_DRAFT);
          setSection("list");
        }
        broadcastChange();
        refreshDevices();
      } catch (e) {
        console.error("[DeviceManagerDialog DELETE]", e);
        toast.error(e instanceof Error ? e.message : "删除失败");
      } finally {
        setRemovingId(null);
      }
    },
    [broadcastChange, refreshDevices, draft.id]
  );

  /* ── 左栏导航 ── */

  const nav = useMemo<NavGroup[]>(
    () => [
      {
        title: "",
        items: [{ key: "list", label: "设备列表", icon: <IconCpu /> }],
      },
      {
        title: "配置",
        items: [
          {
            key: "create",
            label: draft.id ? "编辑设备" : "新增设备",
            icon: <IconPlus />,
          },
        ],
      },
      {
        title: "系统",
        items: [{ key: "connection", label: "连接与状态", icon: <IconSignal /> }],
      },
    ],
    [draft.id]
  );

  const sectionTitle =
    section === "create"
      ? draft.id
        ? "编辑设备"
        : "新增设备"
      : section === "connection"
        ? "连接与状态"
        : "设备列表";

  const closeDialog = () => onOpenChange(false);

  /** 未保存修改提示（离开编辑分区时） */
  const leaveCreate = () => {
    setDraft(EMPTY_DRAFT);
    setSection("list");
  };

  return (
    <>
    <Modal
      open={open}
      onCancel={() => { if (!saving) closeDialog(); }}
      footer={null}
      closable={false}
      /* 桌面端固定 880；窄屏按视口收敛，避免横向溢出 */
      width="min(880px, 94vw)"
      centered
      mask={{ closable: false }}
      /* 🚨 必须关 focus trap —— 与 access-modal.tsx 同因：antd v6 默认 trap 会把
         Copilot 输入框的焦点硬拽回弹窗内（用户实锤「点一下就收起」）。弹窗 × Copilot
         并用是设备接入的设计前提，trap 必关。详见 access-modal.tsx 同款注释。 */
      focusable={{ trap: false }}
      destroyOnHidden
      rootClassName="device-manager-modal"
      styles={{
        body: { padding: 0 },
        container: {
          padding: 0,
          background: isDark ? "#18181B" : "#FAFAFA",
          borderRadius: ACCESS_RADIUS.panel,
          overflow: "hidden",
          boxShadow: isDark ? "0 12px 40px rgba(0, 0, 0, .55)" : "0 12px 40px rgba(0, 0, 0, .16)",
        },
      }}
    >
      <SettingsModalStyle modalClass="device-manager-modal" scopeClass="device-manager-scope" />
      <style>{ACCESS_LOCAL_CSS}</style>
      <ConfigProvider
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: "#059669",
            borderRadius: ACCESS_RADIUS.control,
            borderRadiusLG: ACCESS_RADIUS.card,
            borderRadiusSM: 6,
          },
        }}
      >
        <div
          className="device-manager-scope"
          data-settings-theme={isDark ? "dark" : "light"}
          /* 上限而不是固定高度：内容短时弹窗自然收紧（与设置弹窗同款 76vh 上限） */
          style={{ display: "flex", height: "min(76vh, 720px)", maxHeight: "min(76vh, 720px)", background: "var(--set-bg)" }}
        >
          {/* ── 左栏 ── */}
          <div
            style={{
              width: 196,
              flexShrink: 0,
              background: "var(--set-sidebar-bg)",
              borderRight: "1px solid var(--set-border)",
              display: "flex",
              flexDirection: "column",
              paddingTop: 14,
            }}
          >
            <div style={{ fontSize: 13, color: "var(--set-text-secondary)", padding: "0 16px 12px" }}>设备管理</div>
            <div data-lenis-prevent style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
              {nav.map((g, gi) => (
                <div key={gi} style={{ marginBottom: g.title ? 14 : 4 }}>
                  {g.title && (
                    <div style={{ fontSize: 12, color: "var(--set-text-tertiary)", padding: "0 8px 6px" }}>{g.title}</div>
                  )}
                  {g.items.map((it) => {
                    const active = section === it.key;
                    return (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => {
                          if (it.key === "create" && section !== "create") setDraft(EMPTY_DRAFT);
                          setSection(it.key);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          marginBottom: 2,
                          border: "none",
                          borderRadius: 8,
                          background: active ? "var(--set-nav-active-bg)" : "transparent",
                          color: active ? "var(--set-text)" : "var(--set-nav-text)",
                          fontSize: 13.5,
                          fontFamily: "inherit",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "background .12s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.background = "var(--set-nav-hover-bg)";
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15,
                            display: "inline-flex",
                            color: active ? "var(--set-text)" : "var(--set-text-secondary)",
                          }}
                        >
                          {it.icon}
                        </span>
                        {it.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* ── 右栏 ── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--set-bg)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 24px 14px",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 600, color: "var(--set-text)" }}>{sectionTitle}</div>
              <button
                type="button"
                onClick={() => { if (!saving) closeDialog(); }}
                aria-label="关闭设备管理"
                style={{
                  width: 28,
                  height: 28,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  borderRadius: ACCESS_RADIUS.control,
                  background: "transparent",
                  color: "var(--set-text-secondary)",
                  cursor: "pointer",
                  fontSize: 15,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--set-hover-fill)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <IconClose />
              </button>
            </div>

            {/* 🚨 portal 到 body 的弹窗，滚动容器必须自带 data-lenis-prevent（同 ai-settings-dialog） */}
            <div data-lenis-prevent style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
              {section === "list" && (
                <ListPanel
                  devices={registryDevices}
                  loading={devicesLoading}
                  stats={stats}
                  manage={manage}
                  togglingId={togglingId}
                  removingId={removingId}
                  onAdd={startCreate}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onToggleEnabled={handleToggleEnabled}
                  onRefresh={() => refreshDevices()}
                  genericDevices={genericDevices}
                  genericLoading={genericLoading}
                  connections={connections}
                  togglingGenericId={togglingGenericId}
                  onAddGeneric={openGenericWizard}
                  onOpenGeneric={setDetailDevice}
                  onToggleGeneric={handleToggleGeneric}
                  onDeleteGeneric={handleDeleteGeneric}
                  onRefreshGeneric={loadGeneric}
                />
              )}

              {section === "create" && (
                <CreatePanel
                  draft={draft}
                  patchDraft={patchDraft}
                  onOpenGeneric={openGenericWizard}
                  connectionCount={connections.length}
                  genericCount={genericDevices.length}
                />
              )}

              {section === "connection" && (
                <ConnectionPanel
                  connected={connectionStatus.connected}
                  lastUpdate={connectionStatus.lastUpdate}
                  error={connectionStatus.error}
                  stats={stats}
                  loading={devicesLoading}
                  onRefresh={() => refreshDevices()}
                  connections={connections}
                  genericLoading={genericLoading}
                  manage={manage}
                  testingConnId={testingConnId}
                  onAddConnection={() => { setEditingConn(null); setConnFormOpen(true); }}
                  onEditConnection={(c) => { setEditingConn(c); setConnFormOpen(true); }}
                  onTestConnection={handleTestConnection}
                  onDeleteConnection={handleDeleteConnection}
                  onRefreshGeneric={loadGeneric}
                />
              )}
            </div>

            {section === "create" && (
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  padding: "12px 24px",
                  borderTop: "1px solid var(--set-border)",
                }}
              >
                <Button onClick={leaveCreate} disabled={saving}>
                  取消
                </Button>
                <Button type="primary" loading={saving} onClick={handleSave} disabled={!manage}>
                  保存
                </Button>
              </div>
            )}
          </div>
        </div>
      </ConfigProvider>
    </Modal>

    {/* 第三方硬件：连接配置 / 接入向导 / 设备详情与控制。
        挂在本弹窗之后（同级）而不是嵌进设置面板里 —— 三个弹窗共用同一套表单与校验，
        页面（设备控制页）与设备管理弹窗打开的是同一份实现。 */}
    <ConnectionForm
      open={connFormOpen}
      protocols={protocols}
      initial={editingConn}
      preset={connPreset}
      onClose={() => { setConnFormOpen(false); setEditingConn(null); setConnPreset(null); }}
      onSaved={handleConnectionSaved}
    />

    <DeviceWizard
      open={wizardOpen}
      connections={connections}
      protocols={protocols}
      defaultConnectionId={connections[0]?.id ?? null}
      draft={wizardDraft}
      onClose={() => { setWizardOpen(false); setWizardDraft(null); }}
      onCreated={() => { void loadGeneric(); }}
    />

    <DeviceDetail
      open={!!detailDevice}
      device={detailDevice}
      connection={
        detailDevice?.connection_id
          ? connections.find((c) => c.id === detailDevice.connection_id) || null
          : null
      }
      onClose={() => setDetailDevice(null)}
      onChanged={() => { void loadGeneric(); }}
    />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 设备列表                                                            */
/* ------------------------------------------------------------------ */

/**
 * 「现在」的时间戳，按固定间隔推进。
 * 渲染期禁止直接调 Date.now()（react-hooks/purity），在线判定又必须随时间变化，
 * 所以把时间做成状态：列表挂多久都可以，每 30s 重新算一次在线。
 */
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function ListPanel({
  devices,
  loading,
  stats,
  manage,
  togglingId,
  removingId,
  onAdd,
  onEdit,
  onDelete,
  onToggleEnabled,
  onRefresh,
  genericDevices,
  genericLoading,
  connections,
  togglingGenericId,
  onAddGeneric,
  onOpenGeneric,
  onToggleGeneric,
  onDeleteGeneric,
  onRefreshGeneric,
}: {
  devices: RegistryDevice[];
  loading: boolean;
  stats: { total: number; enabled: number; disabled: number };
  manage: boolean;
  togglingId: number | null;
  removingId: number | null;
  onAdd: () => void;
  onEdit: (d: RegistryDevice) => void;
  onDelete: (d: RegistryDevice) => void;
  onToggleEnabled: (d: RegistryDevice, enabled: boolean) => void;
  onRefresh: () => void;
  genericDevices: DeviceView[];
  genericLoading: boolean;
  connections: ConnectionView[];
  togglingGenericId: number | null;
  onAddGeneric: () => void;
  onOpenGeneric: (d: DeviceView) => void;
  onToggleGeneric: (d: DeviceView, enabled: boolean) => void;
  onDeleteGeneric: (d: DeviceView) => void;
  onRefreshGeneric: () => void;
}) {
  const nowTs = useNow();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <GroupTitle>
          共 {stats.total} 台 · 启用 {stats.enabled} · 禁用 {stats.disabled}
        </GroupTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Button size="small" icon={<IconRefresh size={14} />} onClick={onRefresh} loading={loading}>
            刷新
          </Button>
          {manage && (
            <Button size="small" type="primary" icon={<IconPlus size={14} />} onClick={onAdd}>
              新增设备
            </Button>
          )}
        </div>
      </div>

      {!manage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            marginBottom: 12,
            borderRadius: 8,
            background: "var(--set-subcard-bg)",
            border: "1px solid var(--set-subcard-border)",
            fontSize: 13,
            color: "var(--set-text-secondary)",
          }}
        >
          <IconSignal size={15} />
          当前账号为只读权限，设备的新增 / 修改 / 删除需要管理员在后台操作。
        </div>
      )}

      <Card>
        {loading && devices.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <Spin />
          </div>
        ) : devices.length === 0 ? (
          <div style={{ padding: "36px 20px" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: "var(--set-text-secondary)", fontSize: 13 }}>
                  还没有注册任何设备，点击「新增设备」添加第一台
                </span>
              }
            />
          </div>
        ) : (
          devices.map((d, i) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 20px",
                minHeight: 64,
                borderBottom: i === devices.length - 1 ? "none" : "1px solid var(--set-row-border)",
                opacity: d.is_enabled ? 1 : 0.6,
              }}
            >
              <DeviceIconBox icon={d.icon} color={d.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--set-text)",
                    lineHeight: "22px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.name}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--set-text-secondary)",
                    lineHeight: "18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {d.category && <span>{d.category}</span>}
                  {d.node_id && <span style={{ fontFamily: "monospace" }}>· {d.node_id}</span>}
                  {typeof d.config?.relay_num === "number" && (
                    <span style={{ fontFamily: "monospace" }}>· relay{d.config.relay_num}</span>
                  )}
                  {d.subscribe_topic && <span style={{ fontFamily: "monospace" }}>· sub {d.subscribe_topic}</span>}
                  {d.publish_topic && <span style={{ fontFamily: "monospace" }}>· pub {d.publish_topic}</span>}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <Tag color={TYPE_TAG_COLOR[d.type]} style={{ marginInlineEnd: 0 }}>
                  {TYPE_LABEL[d.type]}
                </Tag>
                {d.is_critical && (
                  <Tag color="red" style={{ marginInlineEnd: 0 }}>
                    关键
                  </Tag>
                )}
                {/* 临时禁用的显式标识：整行已降到 0.6 透明度，但纯变灰容易被误读成「加载中」 */}
                {!d.is_enabled && (
                  <Tag color="default" style={{ marginInlineEnd: 0 }}>
                    已禁用
                  </Tag>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <GreenSwitch
                  size="small"
                  title={d.is_enabled ? "临时禁用该设备（设备仍保留在列表中）" : "重新启用该设备"}
                  checked={!!d.is_enabled}
                  disabled={!manage}
                  loading={togglingId === d.id}
                  onChange={(v) => onToggleEnabled(d, v)}
                />
                {manage && (
                  <>
                    <Button
                      type="text"
                      size="small"
                      title="编辑"
                      icon={<IconEdit size={14} />}
                      onClick={() => onEdit(d)}
                    />
                    <Popconfirm
                      title="删除设备"
                      description={`确定要删除「${d.name}」吗？此操作不可恢复。`}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => onDelete(d)}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        title="删除"
                        loading={removingId === d.id}
                        icon={<IconDelete size={14} />}
                      />
                    </Popconfirm>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </Card>

      {/* ── 第三方硬件（通用接入）────────────────────────────────
          与上面的专属硬件并列展示：数据来自 /api/device-platform/*，
          开关=临时禁用，点「详情」进入属性监控与动作下发。 */}
      <div style={{ height: 18 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <GroupTitle>
          第三方硬件 · {genericDevices.length} 台
        </GroupTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Button size="small" icon={<IconRefresh size={14} />} onClick={onRefreshGeneric} loading={genericLoading}>
            刷新
          </Button>
          {manage && (
            <Button size="small" type="primary" icon={<IconLink size={14} />} onClick={onAddGeneric}>
              接入设备
            </Button>
          )}
        </div>
      </div>

      <Card>
        {genericLoading && genericDevices.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <Spin />
          </div>
        ) : genericDevices.length === 0 ? (
          <div style={{ padding: "30px 20px" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: "var(--set-text-secondary)", fontSize: 13, lineHeight: "20px" }}>
                  还没有第三方设备。支持 MQTT / HTTP(REST) / Modbus TCP，
                  <br />
                  设备有哪些属性、能执行什么动作由你定义，不用为每款硬件改代码。
                </span>
              }
            />
            {manage && (
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <Button type="primary" size="small" icon={<IconLink size={14} />} onClick={onAddGeneric}>
                  接入第一台第三方设备
                </Button>
              </div>
            )}
          </div>
        ) : (
          genericDevices.map((d, i) => {
            const conn = connections.find((c) => c.id === d.connection_id);
            /**
             * 🚨 不能直接写 `Date.now()`：react-hooks/purity 会把渲染期调用当成
             * 不纯函数报错（同一份 props 两次渲染结果不同）。用 tick 状态推进「现在」，
             * 30s 一次足够表达「5 分钟内上报过 = 在线」。
             */
            const online = !!d.last_seen_at && nowTs - d.last_seen_at < 5 * 60 * 1000;
            const propCount = d.thing_model?.properties?.length ?? 0;
            return (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  minHeight: 64,
                  borderBottom: i === genericDevices.length - 1 ? "none" : "1px solid var(--set-row-border)",
                  opacity: d.is_enabled ? 1 : 0.6,
                }}
              >
                <DeviceIconBox icon={d.icon} color={d.color || "#059669"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--set-text)",
                      lineHeight: "22px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--set-text-secondary)",
                      lineHeight: "18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{conn?.name || "未绑定连接"}</span>
                    {d.external_id && <span style={{ fontFamily: "monospace" }}>· {d.external_id}</span>}
                    <span>· {propCount} 个属性</span>
                    <span>· 上报 {formatTime(d.last_seen_at)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Tag color={online ? "green" : "default"} style={{ marginInlineEnd: 0 }}>
                    {online ? "在线" : "离线"}
                  </Tag>
                  <Tag color="cyan" style={{ marginInlineEnd: 0 }}>
                    {GENERIC_PROTOCOL_LABEL[d.protocol || ""] || "通用"}
                  </Tag>
                  {!d.is_enabled && (
                    <Tag color="default" style={{ marginInlineEnd: 0 }}>
                      已禁用
                    </Tag>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <GreenSwitch
                    size="small"
                    title={d.is_enabled ? "临时禁用该设备（仍保留在列表中）" : "重新启用该设备"}
                    checked={!!d.is_enabled}
                    disabled={!manage}
                    loading={togglingGenericId === d.id}
                    onChange={(v) => onToggleGeneric(d, v)}
                  />
                  <Button
                    type="text"
                    size="small"
                    title="详情与控制"
                    icon={<IconSignal size={14} />}
                    onClick={() => onOpenGeneric(d)}
                  />
                  {manage && (
                    <Popconfirm
                      title="移除设备"
                      description={`确定要移除「${d.name}」吗？属性历史会一并删除。`}
                      okText="移除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => onDeleteGeneric(d)}
                    >
                      <Button type="text" size="small" danger title="移除" icon={<IconDelete size={14} />} />
                    </Popconfirm>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>

      <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--set-text-tertiary)", lineHeight: "18px" }}>
        开关为临时禁用：设备仍保留在注册表中，重新打开即可恢复。设备的启停与增删会立即同步到设备控制页、设备分组与 AI 助手（莓小智）。
        第三方硬件通过「连接」接入（MQTT / HTTP / Modbus TCP），可同时接多套外部系统。
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 新增 / 编辑                                                        */
/* ------------------------------------------------------------------ */

function CreatePanel({
  draft,
  patchDraft,
  onOpenGeneric,
  connectionCount,
  genericCount,
}: {
  draft: Draft;
  patchDraft: (p: Partial<Draft>) => void;
  onOpenGeneric: () => void;
  connectionCount: number;
  genericCount: number;
}) {
  const isRelay = draft.type === "relay";
  const isSensor = draft.type === "sensor";

  return (
    <div>
      {/* 新增时先选来源：专属硬件走内置协议，第三方硬件走通用接入向导 */}
      {!draft.id && (
        <>
          <GroupTitle>接入方式</GroupTitle>
          <Card>
            <Row
              title="专属硬件（内置协议）"
              desc="继电器 / 传感器 / 摄像头 / 步进电机，使用平台内置的 MQTT 节点协议，继续填写下方表单即可"
            >
              <Tag color="green" style={{ marginInlineEnd: 0 }}>
                当前方式
              </Tag>
            </Row>
            <Row
              title="第三方硬件（通用接入）"
              desc={`MQTT / HTTP(REST) / Modbus TCP，设备属性与动作自定义。已配置 ${connectionCount} 条连接、${genericCount} 台设备`}
            >
              <Button size="small" type="primary" icon={<IconLink size={14} />} onClick={onOpenGeneric}>
                接入向导
              </Button>
            </Row>
            <Row title="不确定怎么填？交给莓小智" desc="在 AI 助手里说「我想接入一台温湿度传感器」，它会问清协议与参数，直接把方案填进接入向导" last>
              <Tag color="default" style={{ marginInlineEnd: 0 }}>
                AI 辅助
              </Tag>
            </Row>
          </Card>
          <div style={{ height: 18 }} />
        </>
      )}

      <GroupTitle>基本信息</GroupTitle>
      <Card>
        <Row title="设备名称" desc="展示在设备卡片与 AI 助手对话里的名称">
          <Input
            value={draft.name}
            onChange={(e) => patchDraft({ name: e.target.value })}
            placeholder="例如：水泵系统"
            maxLength={50}
            style={{ width: 260 }}
          />
        </Row>
        <Row title="设备类型" desc="决定 config 结构与可用的控制指令">
          <Dropdown
            value={draft.type}
            onChange={(v) => patchDraft({ type: v as DeviceType })}
            options={TYPE_OPTIONS}
            style={{ width: 160, minWidth: 160 }}
          />
        </Row>
        <Row title="业务分类" desc="例如 灌溉 / 通风 / 照明 / 环境监测">
          <AutoComplete
            value={draft.category}
            onChange={(v) => patchDraft({ category: v })}
            options={CATEGORY_PRESETS.map((c) => ({ value: c }))}
            placeholder="选择或输入"
            style={{ width: 260 }}
          />
        </Row>
        <Row title="排序权重" desc="数值越小越靠前" last>
          <InputNumber
            value={draft.sort_order}
            min={0}
            max={9999}
            onChange={(v) => patchDraft({ sort_order: Number(v ?? 0) })}
            style={{ width: 120 }}
          />
        </Row>
      </Card>

      <div style={{ height: 18 }} />
      <GroupTitle>连接配置</GroupTitle>
      <Card>
        <Row title="Node ID" desc="对应 MQTT node 映射，继电器/步进电机常用，例如 node0601">
          <Input
            value={draft.node_id}
            onChange={(e) => patchDraft({ node_id: e.target.value })}
            placeholder="例如 node0601"
            style={{ width: 260, fontFamily: "monospace" }}
          />
        </Row>
        {isSensor && (
          <Row title="订阅 Topic" desc="传感器上报数据的 MQTT topic，MQTT 服务会动态订阅" last>
            <Input
              value={draft.subscribe_topic}
              onChange={(e) => patchDraft({ subscribe_topic: e.target.value })}
              placeholder="例如 meimefarm/basic_env_data"
              style={{ width: 320, fontFamily: "monospace" }}
            />
          </Row>
        )}
        {(isRelay || draft.type === "stepper") && (
          <Row title="发布 Topic" desc="下发控制指令的 MQTT topic" last>
            <Input
              value={draft.publish_topic}
              onChange={(e) => patchDraft({ publish_topic: e.target.value })}
              placeholder="例如 data/set"
              style={{ width: 320, fontFamily: "monospace" }}
            />
          </Row>
        )}
        {draft.type === "camera" && (
          <Row
            title="视频流地址"
            desc={'摄像头不走 MQTT：请在下方「高级配置」里填 { "stream_url": "rtsp://..." }'}
            last
          >
            <Tag color="purple" style={{ marginInlineEnd: 0 }}>
              见 config
            </Tag>
          </Row>
        )}
      </Card>

      <div style={{ height: 18 }} />
      <GroupTitle>外观</GroupTitle>
      <Card>
        <Row title="图标" desc="设备卡片与列表里的图标">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: ACCESS_RADIUS.control,
                background: draft.color,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {renderDeviceIcon(draft.icon, { size: 16, strokeWidth: 2 })}
            </span>
            <Dropdown
              value={draft.icon}
              onChange={(v) => patchDraft({ icon: String(v) || "IconCpu" })}
              options={ICON_OPTIONS}
              style={{ width: 220, minWidth: 220 }}
              showSearch
              optionFilterProp="label"
            />
          </div>
        </Row>
        <Row title="颜色" desc="图标底色，同时用于设备卡片的高亮色" last>
          <ColorPicker
            value={draft.color}
            format="hex"
            showText
            presets={DEVICE_COLOR_PRESETS}
            onChange={(c) => patchDraft({ color: c.toHexString() })}
          />
        </Row>
      </Card>

      <div style={{ height: 18 }} />
      <GroupTitle>行为</GroupTitle>
      <Card>
        {isRelay && (
          <Row title="关键设备" desc="关键继电器在执行前需要二次确认（CHECKPOINT）">
            <GreenSwitch checked={draft.is_critical} onChange={(v) => patchDraft({ is_critical: v })} />
          </Row>
        )}
        <Row
          title="启用"
          desc="临时禁用：设备不会被删除，仍保留在设备列表中并可随时重新启用；禁用期间不出现在设备控制面板与 AI 工具列表中"
          last
        >
          <GreenSwitch checked={draft.is_enabled} onChange={(v) => patchDraft({ is_enabled: v })} />
        </Row>
      </Card>

      <div style={{ height: 18 }} />
      <GroupTitle>高级配置（JSON）</GroupTitle>
      <Card>
        <Row
          vertical
          last
          title="type 相关参数"
          desc={
            isRelay
              ? '继电器：{ "relay_num": 5 }'
              : draft.type === "stepper"
                ? '步进电机：{ "pulses_per_mm": 160, "max_travel_mm": 700 }'
                : draft.type === "camera"
                  ? '摄像头：{ "stream_url": "rtsp://...", "camera_id": "a" }'
                  : '传感器：{ "metrics": [{ "key": "temperature", "label": "温度", "unit": "℃", "mqtt_field": "temperature", "scale": 0.1 }] }'
          }
        >
          <TextArea
            value={draft.configText}
            onChange={(e) => patchDraft({ configText: e.target.value })}
            autoSize={{ minRows: 4, maxRows: 12 }}
            style={{ fontFamily: "monospace", fontSize: 12.5 }}
          />
        </Row>
      </Card>

      <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--set-text-tertiary)", lineHeight: "18px" }}>
        保存后会立即刷新设备注册表，设备控制页与 AI 助手同步生效。
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 连接与状态                                                          */
/* ------------------------------------------------------------------ */

function ConnectionPanel({
  connected,
  lastUpdate,
  error,
  stats,
  loading,
  onRefresh,
  connections,
  genericLoading,
  manage,
  testingConnId,
  onAddConnection,
  onEditConnection,
  onTestConnection,
  onDeleteConnection,
  onRefreshGeneric,
}: {
  connected: boolean;
  lastUpdate: Date | null;
  error: string | null;
  stats: { total: number; enabled: number; disabled: number; byType: Array<{ type: DeviceType; count: number }> };
  loading: boolean;
  onRefresh: () => void;
  connections: ConnectionView[];
  genericLoading: boolean;
  manage: boolean;
  testingConnId: number | null;
  onAddConnection: () => void;
  onEditConnection: (c: ConnectionView) => void;
  onTestConnection: (c: ConnectionView) => void;
  onDeleteConnection: (c: ConnectionView) => void;
  onRefreshGeneric: () => void;
}) {
  return (
    <div>
      {/* ── 第三方接入连接：通用硬件的通信通道 ── */}
      <GroupTitle>第三方接入连接</GroupTitle>
      <Card>
        {connections.length === 0 ? (
          <Row
            title="还没有接入连接"
            desc="连接 = 平台与外部硬件的通信通道：一个 MQTT broker、一个 HTTP 服务或一台 PLC。建好连接后即可往里挂设备"
            last
          >
            {manage ? (
              <Button size="small" type="primary" icon={<IconPlus size={14} />} onClick={onAddConnection}>
                新增连接
              </Button>
            ) : (
              <Text style={{ fontSize: 13.5, color: "var(--set-text-secondary)" }}>暂无</Text>
            )}
          </Row>
        ) : (
          <>
            {connections.map((c, i) => (
              <Row
                key={c.id}
                title={`${c.name} · ${GENERIC_PROTOCOL_LABEL[c.protocol] || c.protocol}`}
                desc={`${genericEndpoint(c)} · ${c.deviceCount ?? 0} 台设备${c.last_ok_at ? ` · 最近连通 ${formatTime(c.last_ok_at)}` : ""}${c.last_error ? ` · 错误：${c.last_error}` : ""}${c.is_enabled ? "" : " · 已停用"}`}
                last={i === connections.length - 1}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Button
                    size="small"
                    loading={testingConnId === c.id}
                    onClick={() => onTestConnection(c)}
                  >
                    测试
                  </Button>
                  {manage && (
                    <>
                      <Button size="small" onClick={() => onEditConnection(c)}>
                        编辑
                      </Button>
                      <Popconfirm
                        title="删除该连接"
                        description={
                          (c.deviceCount ?? 0) > 0
                            ? "连接下还有设备，请先在设备列表里移除"
                            : "删除后不可恢复"
                        }
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true, disabled: (c.deviceCount ?? 0) > 0 }}
                        onConfirm={() => onDeleteConnection(c)}
                      >
                        <Button size="small" type="text" danger icon={<IconDelete size={14} />} />
                      </Popconfirm>
                    </>
                  )}
                </div>
              </Row>
            ))}
          </>
        )}

        {connections.length > 0 && manage && (
          <Row title="继续接入" desc="可同时接多家平台 / 网关，互不影响" last>
            <Button size="small" icon={<IconPlus size={14} />} loading={genericLoading} onClick={onAddConnection}>
              新增连接
            </Button>
          </Row>
        )}
      </Card>

      <div style={{ height: 18 }} />
      <GroupTitle>实时链路</GroupTitle>
      <Card>
        <Row title="设备数据连接" desc="通过 /api/mqtt/stream 的 SSE 长连接接收实时数据">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--set-text)" }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: connected ? "#12B76A" : "#DC2626",
                display: "inline-block",
              }}
            />
            {connected ? "在线" : "离线"}
          </span>
        </Row>
        <Row title="最后更新" desc={error ? `最近一次错误：${error}` : "收到最近一帧设备数据的时刻"}>
          <Text style={{ fontSize: 13.5, color: "var(--set-text)" }}>{formatTime(lastUpdate?.getTime())}</Text>
        </Row>
        <Row title="刷新注册表" desc="重新读取 /api/devices（一般无需手动操作）" last>
          <Button size="small" icon={<IconRefresh size={14} />} loading={loading} onClick={onRefresh}>
            立即刷新
          </Button>
        </Row>
      </Card>

      <div style={{ height: 18 }} />
      <GroupTitle>注册表统计</GroupTitle>
      <Card>
        <Row title="设备总数">
          <Text style={{ fontSize: 13.5, color: "var(--set-text)" }}>{stats.total} 台</Text>
        </Row>
        <Row title="已启用">
          <Text style={{ fontSize: 13.5, color: "var(--set-text)" }}>{stats.enabled} 台</Text>
        </Row>
        <Row title="已禁用" desc="禁用后不参与设备控制与 AI 工具链" last>
          <Text style={{ fontSize: 13.5, color: "var(--set-text)" }}>{stats.disabled} 台</Text>
        </Row>
      </Card>

      <div style={{ height: 18 }} />
      <GroupTitle>类型分布</GroupTitle>
      <Card>
        {stats.byType.map((t, i) => (
          <Row key={t.type} title={TYPE_LABEL[t.type]} last={i === stats.byType.length - 1}>
            <Text style={{ fontSize: 13.5, color: "var(--set-text)" }}>{t.count} 台</Text>
          </Row>
        ))}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 入口卡片（admin 后台「摄像头与设备」分区用）                          */
/* ------------------------------------------------------------------ */

export function DeviceManagerLauncher() {
  const { allDevices, devices, refreshDevices } = useDeviceContext();
  // 统计用完整注册表，否则「禁用」恒为 0（devices 里根本没有禁用设备）
  const registry = allDevices ?? devices;
  const enabled = registry.filter((d) => d.is_enabled).length;

  return (
    <AntCard style={{ border: "1px solid #EDEEEF" }} styles={{ body: { padding: 16 } }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#18181B" }}>设备管理</div>
          <div style={{ fontSize: 12, color: "#8F959E", marginTop: 2 }}>
            共 {registry.length} 台设备 · 启用 {enabled} · 禁用 {registry.length - enabled}
          </div>
        </div>
        <Button
          type="primary"
          icon={<IconCpu size={14} />}
          onClick={() => {
            // 兜底刷新一次注册表，再广播打开事件（弹窗内部也会读同一份 DeviceProvider 数据）
            refreshDevices();
            window.dispatchEvent(new CustomEvent(OPEN_DEVICE_MANAGER_EVENT));
          }}
        >
          打开设备管理
        </Button>
      </div>
    </AntCard>
  );
}
