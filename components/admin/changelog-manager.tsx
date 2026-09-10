"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Tag as AntTag,
  Typography,
} from "antd";
import { EditOutlined, HistoryOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { toast } from "sonner";

const { Text } = Typography;

/* -------------------------------------------------------------------------- */
/* 更新日志管理：列表 + 新建/编辑 + 删除（数据 → /api/admin/changelog）          */
/* -------------------------------------------------------------------------- */

interface ChangelogItem {
  tag: "new" | "improve" | "fix";
  text: string;
}

interface ChangelogEntry {
  id: number;
  version: string;
  title: string;
  summary: string;
  releasedAt: string;
  items: ChangelogItem[];
  published: boolean;
}

interface FormState {
  id: number | null;
  version: string;
  title: string;
  summary: string;
  releasedAt: string;
  items: ChangelogItem[];
  published: boolean;
}

const TAG_META: Record<ChangelogItem["tag"], { label: string; color: string }> = {
  new: { label: "新增", color: "#009456" },
  improve: { label: "改进", color: "#B54708" },
  fix: { label: "修复", color: "#D92D20" },
};

const emptyForm = (): FormState => ({
  id: null,
  version: "",
  title: "",
  summary: "",
  releasedAt: new Date().toISOString().slice(0, 10),
  items: [{ tag: "new", text: "" }],
  published: true,
});

export function ChangelogManager() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/changelog");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "加载失败");
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (entry: ChangelogEntry) => {
    setForm({
      id: entry.id,
      version: entry.version,
      title: entry.title,
      summary: entry.summary,
      releasedAt: entry.releasedAt,
      items: entry.items.length > 0 ? entry.items.map((i) => ({ ...i })) : [{ tag: "new", text: "" }],
      published: entry.published,
    });
    setModalOpen(true);
  };

  const setItem = (index: number, patch: Partial<ChangelogItem>) => {
    setForm((f) => {
      const items = f.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
      return { ...f, items };
    });
  };

  const addItem = () => {
    setForm((f) => ({ ...f, items: [...f.items, { tag: "new", text: "" }] }));
  };

  const removeItem = (index: number) => {
    setForm((f) => {
      const items = f.items.filter((_, i) => i !== index);
      return { ...f, items: items.length > 0 ? items : [{ tag: "new", text: "" }] };
    });
  };

  const handleSave = async () => {
    const version = form.version.trim();
    if (!version) {
      toast.warning("请输入版本号");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.releasedAt)) {
      toast.warning("请选择发布日期");
      return;
    }
    const items = form.items.filter((i) => i.text.trim());
    if (items.length === 0) {
      toast.warning("请至少填写一条更新内容");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id,
        version,
        title: form.title.trim(),
        summary: form.summary.trim(),
        releasedAt: form.releasedAt,
        items: items.map((i) => ({ tag: i.tag, text: i.text.trim() })),
        published: form.published,
      };
      const res = await fetch("/api/admin/changelog", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "保存失败");
      toast.success(form.id ? "更新成功" : "发布成功");
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/changelog?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "删除失败");
      toast.success("已删除");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  };

  const togglePublished = async (entry: ChangelogEntry) => {
    try {
      const res = await fetch("/api/admin/changelog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          version: entry.version,
          title: entry.title,
          summary: entry.summary,
          releasedAt: entry.releasedAt,
          items: entry.items,
          published: !entry.published,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "操作失败");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    }
  };

  return (
    <Card
      title={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <HistoryOutlined style={{ color: "#009456" }} />
          更新日志管理
        </span>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建版本
        </Button>
      }
      style={{ border: "1px solid #EDEEEF" }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Spin />
        </div>
      ) : entries.length === 0 ? (
        <Empty description="还没有更新日志，点右上角「新建版本」发布第一条" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                border: "1px solid #EDEEEF",
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexWrap: "wrap" }}>
                  <Text strong style={{ fontSize: 16 }}>{entry.version}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{entry.releasedAt}</Text>
                  {entry.published ? (
                    <AntTag color="green" style={{ margin: 0 }}>已发布</AntTag>
                  ) : (
                    <AntTag style={{ margin: 0 }}>草稿</AntTag>
                  )}
                  {entry.title && (
                    <Text type="secondary" ellipsis style={{ maxWidth: 360, fontSize: 12 }}>
                      {entry.title}
                    </Text>
                  )}
                </div>
                <Space size={4}>
                  <Button size="small" type="text" onClick={() => togglePublished(entry)}>
                    {entry.published ? "下架" : "发布"}
                  </Button>
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(entry)}>
                    编辑
                  </Button>
                  <Popconfirm
                    title="删除这条更新日志？"
                    description="删除后前台立即不可见，且无法恢复。"
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(entry.id)}
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
              {entry.summary && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>{entry.summary}</div>
              )}
              <div style={{ marginTop: 6, fontSize: 12, color: "#8F959E" }}>
                {entry.items.length} 条内容
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建 / 编辑弹窗 */}
      <Modal
        title={form.id ? `编辑 ${form.version}` : "新建更新日志"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={680}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave}>
            {form.id ? "保存" : "发布"}
          </Button>,
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <Text type="secondary" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>版本号 *</Text>
              <Input
                placeholder="例如 4.2.0"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              />
            </div>
            <div>
              <Text type="secondary" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>发布日期 *</Text>
              <Input
                type="date"
                value={form.releasedAt}
                onChange={(e) => setForm((f) => ({ ...f, releasedAt: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Text type="secondary" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
              本版主题（前台绿色小标题，可选）
            </Text>
            <Input
              placeholder="例如：设备调控闭环"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <Text type="secondary" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
              一句话摘要（可选）
            </Text>
            <Input.TextArea
              rows={2}
              placeholder="本次更新主要带来了……"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>更新条目 *</Text>
              <Button size="small" type="text" icon={<PlusOutlined />} onClick={addItem}>
                加一条
              </Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {form.items.map((item, index) => (
                <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Select
                    value={item.tag}
                    onChange={(v) => setItem(index, { tag: v })}
                    style={{ width: 92, flexShrink: 0 }}
                    options={(Object.keys(TAG_META) as ChangelogItem["tag"][]).map((t) => ({
                      value: t,
                      label: TAG_META[t].label,
                    }))}
                  />
                  <Input
                    placeholder="例如：新增设备控制卡，对话里直接开关风机"
                    value={item.text}
                    onChange={(e) => setItem(index, { text: e.target.value })}
                    onPressEnter={addItem}
                  />
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(index)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
            <Switch
              checked={form.published}
              onChange={(v) => setForm((f) => ({ ...f, published: v }))}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              立即发布到前台（关闭则保存为草稿）
            </Text>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
