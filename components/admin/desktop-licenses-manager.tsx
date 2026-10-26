"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { toast } from "@/lib/ui/feedback";
import { IconDelete, IconEdit, IconPlus, IconThunderbolt } from "@/components/icon";

const { Text } = Typography;

/* -------------------------------------------------------------------------- */
/* 桌面端授权码管理                                                             */
/*                                                                            */
/* 数据 → /api/admin/desktop-licenses（列表/签发/改期/吊销/删除）                 */
/*       /api/admin/desktop-licenses/activations（查看/解绑已激活设备）           */
/*                                                                            */
/* 这里决定「一个码能用多久」：到期时间可随时改，改完客户端下次心跳即生效。          */
/* -------------------------------------------------------------------------- */

interface DesktopLicense {
  id: number;
  code: string;
  label: string;
  status: "active" | "revoked";
  kind: "online" | "offline";
  maxActivations: number;
  expiresAt: number | null;
  /** 离线宽限天数；null = 用默认（7 天） */
  graceDays: number | null;
  createdAt: number;
  updatedAt: number;
  activeCount: number;
}

interface DesktopActivation {
  id: number;
  licenseId: number;
  deviceId: string;
  deviceName: string;
  platform: string;
  appVersion: string;
  status: "active" | "released" | "revoked";
  ip: string;
  activatedAt: number;
  lastSeenAt: number;
}

/** 有效期设置方式 */
type ExpiryMode = "permanent" | "days" | "date" | "extend";

const DAY = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(ms: number | null): string {
  if (ms == null) return "永久";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 剩余天数：null = 永久；负数 = 已过期 */
function daysLeft(ms: number | null): number | null {
  if (ms == null) return null;
  return Math.ceil((ms - Date.now()) / DAY);
}

/** 输入框里的 YYYY-MM-DD → 当天 23:59:59 的毫秒时间戳 */
function dateToMs(date: string, endOfDay = true): number | null {
  if (!date) return null;
  const d = new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function msToDateInput(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function statusOf(license: DesktopLicense): { label: string; color: string; key: string } {
  if (license.status === "revoked") return { label: "已停用", color: "#D92D20", key: "revoked" };
  const left = daysLeft(license.expiresAt);
  if (left !== null && left <= 0) return { label: "已过期", color: "#8F959E", key: "expired" };
  return { label: "有效", color: "#059669", key: "active" };
}

/* -------------------------------------------------------------------------- */
/* 有效期设置（生成 / 改期共用的三件套）                                          */
/* -------------------------------------------------------------------------- */

interface ExpiryValue {
  mode: ExpiryMode;
  days: number;
  date: string;
}

const defaultExpiry = (mode: ExpiryMode = "days"): ExpiryValue => ({ mode, days: 365, date: "" });

function ExpiryPicker({
  value,
  onChange,
  allowExtend,
}: {
  value: ExpiryValue;
  onChange: (next: ExpiryValue) => void;
  allowExtend?: boolean;
}) {
  const options = [
    { value: "days", label: "按天数" },
    { value: "date", label: "指定到期日" },
    { value: "permanent", label: "永久有效" },
    ...(allowExtend ? [{ value: "extend", label: "在原到期日顺延" }] : []),
  ];

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Select
        value={value.mode}
        onChange={(mode: ExpiryMode) => onChange({ ...value, mode })}
        options={options}
        style={{ width: "100%" }}
      />
      {value.mode === "days" && (
        <Space size={8}>
          <InputNumber
            min={1}
            max={36500}
            value={value.days}
            onChange={(v) => onChange({ ...value, days: Number(v) || 1 })}
            style={{ width: 140 }}
            addonAfter="天"
          />
          <Space size={4}>
            {[30, 90, 365].map((d) => (
              <Button key={d} size="small" onClick={() => onChange({ ...value, days: d })}>
                {d === 365 ? "1 年" : `${d} 天`}
              </Button>
            ))}
          </Space>
        </Space>
      )}
      {value.mode === "date" && (
        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          style={{
            width: 180,
            height: 32,
            padding: "0 10px",
            border: "1px solid #EDEEEF",
            borderRadius: 6,
            fontSize: 13,
            color: "#18181B",
            outline: "none",
          }}
        />
      )}
      {value.mode === "extend" && (
        <Space size={8}>
          <InputNumber
            min={1}
            max={36500}
            value={value.days}
            onChange={(v) => onChange({ ...value, days: Number(v) || 1 })}
            style={{ width: 140 }}
            addonAfter="天"
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            已过期则从今天起算
          </Text>
        </Space>
      )}
      {value.mode === "permanent" && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          该码永不过期，仅能通过「停用」终止。
        </Text>
      )}
    </Space>
  );
}

/* -------------------------------------------------------------------------- */

export function DesktopLicensesManager() {
  const [licenses, setLicenses] = useState<DesktopLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 签发弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [createMax, setCreateMax] = useState(1);
  const [createGrace, setCreateGrace] = useState<number | null>(7);
  const [createExpiry, setCreateExpiry] = useState<ExpiryValue>(defaultExpiry("days"));

  // 离线授权串弹窗
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [offlineLabel, setOfflineLabel] = useState("");
  const [offlineDevice, setOfflineDevice] = useState("");
  const [offlineExpiry, setOfflineExpiry] = useState<ExpiryValue>(defaultExpiry("days"));
  const [offlineResult, setOfflineResult] = useState<{ code: string; lease: string; deviceId: string } | null>(null);

  // 改期弹窗
  const [editTarget, setEditTarget] = useState<DesktopLicense | null>(null);
  const [editExpiry, setEditExpiry] = useState<ExpiryValue>(defaultExpiry("extend"));
  const [editGrace, setEditGrace] = useState<number | null>(null);

  // 设备弹窗
  const [deviceTarget, setDeviceTarget] = useState<DesktopLicense | null>(null);
  const [activations, setActivations] = useState<DesktopActivation[]>([]);
  const [activationsLoading, setActivationsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/desktop-licenses");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLicenses(data.licenses ?? []);
    } catch (error) {
      console.error(error);
      toast.error("加载授权码列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 把 ExpiryValue 翻译成接口字段 */
  const expiryPayload = (v: ExpiryValue, allowExtend: boolean) => {
    if (v.mode === "permanent") return { permanent: true };
    if (v.mode === "days") return { durationDays: v.days };
    if (v.mode === "extend" && allowExtend) return { extendDays: v.days };
    const ms = dateToMs(v.date);
    return ms == null ? null : { expiresAt: ms };
  };

  const handleCreate = async () => {
    const payload = expiryPayload(createExpiry, false);
    if (!payload) {
      toast.error("请选择到期日");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/desktop-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: createLabel.trim(),
          maxActivations: createMax,
          ...(createGrace != null ? { graceDays: createGrace } : {}),
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "签发失败");
      toast.success(`已签发：${data.license.code}`);
      setCreateOpen(false);
      setCreateLabel("");
      setCreateMax(1);
      setCreateGrace(7);
      setCreateExpiry(defaultExpiry("days"));
      void load();
    } catch (error: any) {
      toast.error(error?.message || "签发失败");
    } finally {
      setSubmitting(false);
    }
  };

  /** 生成离线授权串：服务端用同一把私钥签发，客户端粘贴即用、不联网 */
  const handleOfflineCreate = async () => {
    const device = offlineDevice.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(device)) {
      toast.error("设备指纹应为 64 位十六进制（让客户在激活窗口点「复制」）");
      return;
    }
    const payload = expiryPayload(offlineExpiry, false);
    if (!payload) {
      toast.error("请选择到期日");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/desktop-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "offline",
          deviceId: device,
          deviceName: offlineLabel.trim(),
          label: offlineLabel.trim(),
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "生成失败");
      setOfflineResult({ code: data.offline?.code ?? data.license?.code ?? "", lease: data.offline?.lease ?? "", deviceId: device });
      void load();
    } catch (error: any) {
      toast.error(error?.message || "生成失败");
    } finally {
      setSubmitting(false);
    }
  };

  const closeOffline = () => {
    setOfflineOpen(false);
    setOfflineResult(null);
    setOfflineLabel("");
    setOfflineDevice("");
    setOfflineExpiry(defaultExpiry("days"));
  };

  const openEdit = (license: DesktopLicense) => {
    setEditTarget(license);
    setEditExpiry(defaultExpiry("extend"));
    setEditGrace(license.graceDays);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    const payload = expiryPayload(editExpiry, true);
    if (!payload) {
      toast.error("请选择到期日");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/desktop-licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editTarget.id, graceDays: editGrace, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "修改失败");
      toast.success("已更新，客户端下次校验即生效");
      setEditTarget(null);
      void load();
    } catch (error: any) {
      toast.error(error?.message || "修改失败");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (license: DesktopLicense) => {
    const next = license.status === "revoked" ? "active" : "revoked";
    try {
      const res = await fetch("/api/admin/desktop-licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: license.id, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "操作失败");
      toast.success(next === "revoked" ? "已停用，客户端下次校验将被拒绝" : "已恢复使用");
      void load();
    } catch (error: any) {
      toast.error(error?.message || "操作失败");
    }
  };

  const handleDelete = async (license: DesktopLicense) => {
    try {
      const res = await fetch(`/api/admin/desktop-licenses?id=${license.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "删除失败");
      toast.success("已删除");
      void load();
    } catch (error: any) {
      toast.error(error?.message || "删除失败");
    }
  };

  const openDevices = async (license: DesktopLicense) => {
    setDeviceTarget(license);
    setActivations([]);
    setActivationsLoading(true);
    try {
      const res = await fetch(`/api/admin/desktop-licenses/activations?licenseId=${license.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "加载失败");
      setActivations(data.activations ?? []);
    } catch (error: any) {
      toast.error(error?.message || "加载设备列表失败");
    } finally {
      setActivationsLoading(false);
    }
  };

  const releaseDevice = async (activation: DesktopActivation) => {
    try {
      const res = await fetch("/api/admin/desktop-licenses/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationId: activation.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "解绑失败");
      toast.success("已解绑，该设备下次启动需重新激活");
      setActivations((prev) =>
        prev.map((a) => (a.id === activation.id ? { ...a, status: "released" as const } : a))
      );
      void load();
    } catch (error: any) {
      toast.error(error?.message || "解绑失败");
    }
  };

  const copyCode = async (text: string, okMsg = "已复制") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(okMsg);
    } catch {
      toast.error("复制失败，请手动选择");
    }
  };

  const columns: TableColumnsType<DesktopLicense> = useMemo(
    () => [
      {
        title: "授权码",
        key: "code",
        width: 240,
        render: (_: unknown, record) => (
          <div>
            <Space size={6}>
              <Text
                style={{ fontFamily: "monospace", fontSize: 13, letterSpacing: 0.5, cursor: "pointer" }}
                onClick={() => void copyCode(record.code)}
              >
                {record.code}
              </Text>
              <Tooltip title="复制">
                <Button type="text" size="small" onClick={() => void copyCode(record.code)} style={{ padding: "0 4px" }}>
                  <span style={{ fontSize: 12, color: "#8F959E" }}>复制</span>
                </Button>
              </Tooltip>
            </Space>
            {record.label ? (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {record.label}
                </Text>
              </div>
            ) : null}
          </div>
        ),
      },
      {
        title: "类型",
        key: "kind",
        width: 84,
        render: (_: unknown, record) =>
          record.kind === "offline" ? (
            <Tooltip title="离线授权串：不联网校验、跳过心跳、无法远程吊销">
              <Tag color="#8F959E">离线</Tag>
            </Tooltip>
          ) : (
            <Tooltip title="联网激活 + 每 6 小时心跳，可远程改期 / 吊销">
              <Tag color="#0EA5E9">在线</Tag>
            </Tooltip>
          ),
      },
      {
        title: "状态",
        key: "status",
        width: 90,
        render: (_: unknown, record) => {
          const s = statusOf(record);
          return <Tag color={s.color}>{s.label}</Tag>;
        },
      },
      {
        title: "到期时间",
        key: "expiresAt",
        width: 180,
        render: (_: unknown, record) => {
          const left = daysLeft(record.expiresAt);
          return (
            <div>
              <div style={{ fontSize: 13 }}>{fmtDate(record.expiresAt)}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {left == null ? "永不过期" : left > 0 ? `剩余 ${left} 天` : `已过期 ${Math.abs(left)} 天`}
              </Text>
            </div>
          );
        },
      },
      {
        title: "离线宽限",
        key: "graceDays",
        width: 100,
        render: (_: unknown, record) =>
          record.kind === "offline" ? (
            <Tooltip title="离线授权串不做宽限判定，有效期只看到期时间">
              <Text type="secondary" style={{ fontSize: 12 }}>
                不适用
              </Text>
            </Tooltip>
          ) : (
            <Text style={{ fontSize: 13 }}>
              {record.graceDays == null ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  默认 7 天
                </Text>
              ) : (
                `${record.graceDays} 天`
              )}
            </Text>
          ),
      },
      {
        title: "激活设备",
        key: "devices",
        width: 110,
        render: (_: unknown, record) => (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => void openDevices(record)}>
            {record.activeCount} / {record.maxActivations} 台
          </Button>
        ),
      },
      {
        title: "签发时间",
        key: "createdAt",
        width: 150,
        render: (_: unknown, record) => (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {fmtDateTime(record.createdAt)}
          </Text>
        ),
      },
      {
        title: "操作",
        key: "actions",
        width: 210,
        render: (_: unknown, record) => (
          <Space size={4}>
            <Button type="text" size="small" onClick={() => openEdit(record)}>
              改期
            </Button>
            <Button type="text" size="small" danger={record.status === "active"} onClick={() => void toggleStatus(record)}>
              {record.status === "revoked" ? "恢复" : "停用"}
            </Button>
            <Popconfirm
              title="删除该授权码？"
              description="其下激活记录会一并清除，已激活的客户端将无法再校验通过。"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => void handleDelete(record)}
            >
              <Button type="text" size="small" danger icon={<IconDelete />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [licenses]
  );

  const deviceColumns: TableColumnsType<DesktopActivation> = [
    {
      title: "设备",
      key: "device",
      render: (_: unknown, record) => (
        <div>
          <div style={{ fontSize: 13 }}>{record.deviceName || "未命名设备"}</div>
          <Text type="secondary" style={{ fontSize: 11, fontFamily: "monospace" }}>
            {record.deviceId.slice(0, 24)}…
          </Text>
        </div>
      ),
    },
    {
      title: "平台 / 版本",
      key: "platform",
      width: 150,
      render: (_: unknown, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {[record.platform, record.appVersion].filter(Boolean).join(" · ") || "—"}
        </Text>
      ),
    },
    {
      title: "最后活跃",
      key: "lastSeenAt",
      width: 150,
      render: (_: unknown, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {fmtDateTime(record.lastSeenAt)}
        </Text>
      ),
    },
    {
      title: "状态",
      key: "status",
      width: 90,
      render: (_: unknown, record) =>
        record.status === "active" ? (
          <Tag color="#059669">使用中</Tag>
        ) : (
          <Tag color="#8F959E">{record.status === "released" ? "已解绑" : "已停用"}</Tag>
        ),
    },
    {
      title: "操作",
      key: "actions",
      width: 80,
      render: (_: unknown, record) =>
        record.status === "active" ? (
          <Popconfirm
            title="解绑该设备？"
            description="解绑后该设备需重新输入授权码才能使用。"
            okText="解绑"
            cancelText="取消"
            onConfirm={() => void releaseDevice(record)}
          >
            <Button type="text" size="small" danger>
              解绑
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#18181B", lineHeight: 1.4 }}>桌面端授权</div>
          <div style={{ fontSize: 12, color: "#8F959E", marginTop: 2 }}>
            授权码随时可改期 / 调宽限；离线授权串不联网，服务器停机也能用
          </div>
        </div>
        <Space>
          <Button icon={<IconThunderbolt />} onClick={() => setOfflineOpen(true)}>
            生成离线授权
          </Button>
          <Button type="primary" icon={<IconPlus />} onClick={() => setCreateOpen(true)}>
            签发授权码
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }} style={{ border: "1px solid #EDEEEF" }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={licenses}
          loading={loading}
          scroll={{ x: 1180 }}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty description="还没有授权码，点右上角签发一个" /> }}
          size="middle"
        />
      </Card>

      {/* 签发 */}
      <Modal
        title="签发授权码"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="签发"
        cancelText="取消"
        confirmLoading={submitting}
        width={460}
        destroyOnHidden
      >
        <Space direction="vertical" size={14} style={{ width: "100%", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>备注（客户 / 用途）</div>
            <Input
              value={createLabel}
              onChange={(e) => setCreateLabel(e.target.value)}
              placeholder="例如：张三 · 1 号大棚"
              maxLength={120}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>有效期</div>
            <ExpiryPicker value={createExpiry} onChange={setCreateExpiry} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>
              离线宽限天数
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                客户断网后仍可用的天数；装完就长期断网可填 3650
              </Text>
            </div>
            <Space size={8}>
              <InputNumber
                min={1}
                max={36500}
                value={createGrace}
                onChange={(v) => setCreateGrace(v == null ? null : Number(v))}
                style={{ width: 140 }}
                addonAfter="天"
              />
              <Space size={4}>
                {[7, 90, 3650].map((d) => (
                  <Button key={d} size="small" onClick={() => setCreateGrace(d)}>
                    {d === 7 ? "7 天" : d === 90 ? "90 天" : "≈永久"}
                  </Button>
                ))}
              </Space>
            </Space>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>可激活设备台数</div>
            <InputNumber min={1} max={999} value={createMax} onChange={(v) => setCreateMax(Number(v) || 1)} addonAfter="台" />
          </div>
        </Space>
      </Modal>

      {/* 改期 */}
      <Modal
        title="修改有效期与宽限"
        open={!!editTarget}
        onCancel={() => setEditTarget(null)}
        onOk={() => void handleEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={submitting}
        width={460}
        destroyOnHidden
      >
        {editTarget && (
          <Space direction="vertical" size={14} style={{ width: "100%", marginTop: 8 }}>
            <div style={{ fontSize: 13 }}>
              <Text type="secondary">授权码：</Text>
              <Text style={{ fontFamily: "monospace" }}>{editTarget.code}</Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">当前到期：</Text>
                <Text>{fmtDate(editTarget.expiresAt)}</Text>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>新的有效期</div>
              <ExpiryPicker value={editExpiry} onChange={setEditExpiry} allowExtend />
            </div>
            {editTarget.kind === "offline" ? (
              <div style={{ fontSize: 12, color: "#8F959E" }}>
                离线授权串不做宽限判定，仅由上面的到期时间决定有效期。
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>
                  离线宽限天数
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                    留空恢复默认 7 天
                  </Text>
                </div>
                <Space size={8}>
                  <InputNumber
                    min={1}
                    max={36500}
                    value={editGrace}
                    onChange={(v) => setEditGrace(v == null ? null : Number(v))}
                    style={{ width: 140 }}
                    addonAfter="天"
                  />
                  <Space size={4}>
                    {[7, 90, 3650].map((d) => (
                      <Button key={d} size="small" onClick={() => setEditGrace(d)}>
                        {d === 7 ? "7 天" : d === 90 ? "90 天" : "≈永久"}
                      </Button>
                    ))}
                  </Space>
                </Space>
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* 激活设备 */}
      <Modal
        title={`激活设备 · ${deviceTarget?.code ?? ""}`}
        open={!!deviceTarget}
        onCancel={() => setDeviceTarget(null)}
        footer={null}
        width={680}
        destroyOnHidden
      >
        {activationsLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Spin />
          </div>
        ) : (
          <Table
            rowKey="id"
            columns={deviceColumns}
            dataSource={activations}
            pagination={false}
            size="small"
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该授权码还没有设备激活" /> }}
          />
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: "#8F959E", display: "flex", alignItems: "center", gap: 6 }}>
          <IconThunderbolt style={{ color: "#059669" }} />
          解绑后该设备下次启动会要求重新输入授权码，可立即把名额让给新设备。
        </div>
      </Modal>

      {/* 生成离线授权串 */}
      <Modal
        title="生成离线授权串"
        open={offlineOpen}
        onCancel={closeOffline}
        footer={offlineResult ? null : undefined}
        onOk={() => void handleOfflineCreate()}
        okText="生成"
        cancelText="取消"
        confirmLoading={submitting}
        width={offlineResult ? 580 : 470}
        destroyOnHidden
      >
        {offlineResult ? (
          <Space direction="vertical" size={12} style={{ width: "100%", marginTop: 8 }}>
            <div style={{ fontSize: 13 }}>
              <Text type="secondary">授权码：</Text>
              <Text style={{ fontFamily: "monospace" }}>{offlineResult.code}</Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">目标设备：</Text>
                <Text style={{ fontFamily: "monospace", fontSize: 11 }}>{offlineResult.deviceId}</Text>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>
                离线授权串（整段发给客户，让他在「激活本机」→「离线授权串」里粘贴）
              </div>
              <Input.TextArea
                value={offlineResult.lease}
                readOnly
                autoSize={{ minRows: 4, maxRows: 8 }}
                style={{ fontFamily: "monospace", fontSize: 12 }}
              />
            </div>
            <Space>
              <Button type="primary" onClick={() => void copyCode(offlineResult.lease, "离线授权串已复制")}>
                复制授权串
              </Button>
              <Button onClick={closeOffline}>完成</Button>
            </Space>
            <div style={{ fontSize: 12, color: "#8F959E", lineHeight: 1.6 }}>
              该串纯本地验签、不联网，服务器停机或到期都不影响 —— 代价是无法远程吊销，到期后需重新签发一次。
            </div>
          </Space>
        ) : (
          <Space direction="vertical" size={14} style={{ width: "100%", marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "#8F959E", lineHeight: 1.6 }}>
              给「长期断网」或「授权服务器不可用」的客户发授权：先让客户在激活窗口点「复制」，把本机设备指纹发给你。
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>目标设备指纹</div>
              <Input.TextArea
                value={offlineDevice}
                onChange={(e) => setOfflineDevice(e.target.value)}
                placeholder="64 位十六进制（sha256）"
                autoSize={{ minRows: 2, maxRows: 3 }}
                style={{ fontFamily: "monospace", fontSize: 12 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>备注（客户 / 用途）</div>
              <Input
                value={offlineLabel}
                onChange={(e) => setOfflineLabel(e.target.value)}
                placeholder="例如：李四 · 2 号大棚（离线）"
                maxLength={120}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#646A73", marginBottom: 6 }}>有效期</div>
              <ExpiryPicker value={offlineExpiry} onChange={setOfflineExpiry} />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}

export default DesktopLicensesManager;
