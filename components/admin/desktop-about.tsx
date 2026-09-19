"use client"

import { useEffect, useState } from "react"
import { App, Button, Card, Descriptions, Space, Tag, Typography } from "antd"
import { IconArrowCircleUp, IconCheckOne, IconFileText, IconRefresh, IconSetting } from "@/components/icon";

const { Text } = Typography

/** desktop:backend-info 返回（见 desktop/main.js） */
interface BackendInfo {
  version?: string
  backendUrl?: string
  ports?: Record<string, number>
  serverRoot?: string
  dataRoot?: string
  logFile?: string
  isPackaged?: boolean
}

const PORT_LABELS: Record<string, string> = {
  postgres: "本地数据库",
  mqtt: "MQTT",
  next: "应用服务",
  ws: "WebSocket",
  yjs: "协作服务",
}

/**
 * 桌面端「关于本机」：以用户视角聚合应用版本、本地服务状态、数据/日志位置与
 * 常用维护动作（检查更新 / 打开日志 / 重启应用 / 配置向导）。
 * 仅桌面端渲染（app/admin/page.tsx 桌面菜单才含 desktop-about 分区）。
 */
export function DesktopAbout() {
  const { message } = App.useApp()
  const [info, setInfo] = useState<BackendInfo | null>(null)
  const [checking, setChecking] = useState(false)
  /** 已下载就绪的新版本号（点了"检查更新"且 update-downloaded 已发生过） */
  const [readyVersion, setReadyVersion] = useState<string | null>(null)

  useEffect(() => {
    window.stravisionDesktop
      ?.getBackendInfo?.()
      .then((r) => setInfo((r as BackendInfo) ?? null))
      .catch(() => {})
  }, [])

  const handleCheckUpdate = async () => {
    setChecking(true)
    try {
      const r = await window.stravisionDesktop?.checkForUpdate?.()
      if (!r?.ok) {
        message.error(`检查更新失败：${r?.error ?? "未知错误"}`)
        return
      }
      if (r.ready) {
        setReadyVersion(r.latestVersion ?? null)
        message.success(`新版本 v${r.latestVersion} 已就绪，点击下方"立即重启安装"完成更新`)
      } else if (r.latestVersion && r.latestVersion !== r.currentVersion) {
        message.success(`发现新版本 v${r.latestVersion}，正在后台下载，完成后会弹出安装提示`)
      } else {
        message.info(`已是最新版本（v${r.currentVersion ?? ""}）`)
      }
    } catch (e) {
      message.error(`检查更新失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setChecking(false)
    }
  }

  const handleInstall = () => {
    void window.stravisionDesktop?.installUpdate?.()
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card size="small" style={{ border: "1px solid #EDEEEF" }} title="应用">
        <Descriptions column={1} size="small" style={{ maxWidth: 640 }}>
          <Descriptions.Item label="版本">
            <Space size={12}>
              <Text strong>v{info?.version ?? "…"}</Text>
              {readyVersion ? (
                <Button size="small" type="primary" icon={<IconArrowCircleUp />} onClick={handleInstall}>
                  立即重启安装 v{readyVersion}
                </Button>
              ) : (
                <Button size="small" icon={<IconArrowCircleUp />} loading={checking} onClick={handleCheckUpdate}>
                  检查更新
                </Button>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="运行形态">
            {info?.isPackaged ? <Tag>正式安装版</Tag> : <Tag color="orange">开发模式</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="服务地址">{info?.backendUrl ?? "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" style={{ border: "1px solid #EDEEEF" }} title="本地服务">
        <Descriptions column={1} size="small" style={{ maxWidth: 640 }}>
          {Object.entries(info?.ports ?? {}).map(([k, v]) => (
            <Descriptions.Item key={k} label={PORT_LABELS[k] ?? k}>
              <Space size={8}>
                <IconCheckOne style={{ color: "#52c41a" }} />
                <Text code>127.0.0.1:{v}</Text>
              </Space>
            </Descriptions.Item>
          ))}
          {!info?.ports && <Descriptions.Item label="状态">未就绪</Descriptions.Item>}
        </Descriptions>
      </Card>

      <Card size="small" style={{ border: "1px solid #EDEEEF" }} title="数据与维护">
        <Descriptions column={1} size="small" style={{ maxWidth: 640 }}>
          <Descriptions.Item label="数据目录">
            <Text type="secondary" style={{ fontSize: 12 }} copyable={!!info?.dataRoot}>
              {info?.dataRoot ?? "—"}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="日志文件">
            <Text type="secondary" style={{ fontSize: 12 }}>
              {info?.logFile ?? "—"}
            </Text>
          </Descriptions.Item>
        </Descriptions>
        <Space size={8} wrap style={{ marginTop: 12 }}>
          <Button size="small" icon={<IconFileText />} onClick={() => window.stravisionDesktop?.openLogs?.()}>
            打开日志文件夹
          </Button>
          <Button size="small" icon={<IconSetting />} onClick={() => void window.stravisionDesktop?.openSetup?.()}>
            打开配置向导
          </Button>
          <Button size="small" icon={<IconRefresh />} onClick={() => void window.stravisionDesktop?.relaunch?.()}>
            重启应用
          </Button>
        </Space>
      </Card>
    </Space>
  )
}
