"use client"

import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Tag,
  Divider,
  Spin,
  Empty,
  Tooltip,
  Progress,
} from "antd"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { usePlantGrowth } from "@/lib/hooks/use-plant-growth"
import { IconCalendar, IconCloudy, IconExperiment, IconFire, IconFog, IconInfo, IconLightRain, IconLoading, IconMapDraw, IconMedicineChest, IconSnow, IconSun, IconThunderbolt } from "@/components/icon";

const { Text, Title, Paragraph } = Typography

// ==================== Ant Design 设计令牌 ====================
const TOKENS = {
  fontSize: { xs: 12, sm: 14, base: 16, lg: 20, xl: 24, xxl: 32 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  borderRadius: { sm: 4, md: 6, lg: 8, xl: 12 },
}

// 配色方案
const THEME = {
  primary: "#1677ff",
  success: "#52c41a",
  warning: "#faad14",
  error: "#ff4d4f",
  textPrimary: "#1f1f1f",
  textSecondary: "#8c8c8c",
  border: "#f0f0f0",
  background: "#fafafa",
}

// 设备数据类型
interface DeviceData {
  temperature: number
  humidity: number
  light: number
  co2: number
  earth_temp: number
  earth_water: number
  earth_ec: number
  earth_n: number
  earth_p: number
  earth_k: number
  relay5: number
  relay6: number
  relay7: number
  relay8: number
  led1: number
  led2: number
  led3: number
  led4: number
  timestamp?: number
}

interface WeatherCardProps {
  deviceData?: DeviceData | null
}

// 天气类型映射
type WeatherType = "sunny" | "cloudy" | "rainy" | "snowy" | "foggy"

export function WeatherCard({ deviceData }: WeatherCardProps) {
  const { weatherData, loading, requestLocation } = useWeatherContext()
  const { plantData } = usePlantGrowth()

  // ==================== 工具函数 ====================

  // 获取天气类型
  const getWeatherType = (code: number): WeatherType => {
    if (code === 1000) return "sunny"
    if ([1003, 1006, 1009].includes(code)) return "cloudy"
    if ([1030, 1135, 1147].includes(code)) return "foggy"
    if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258, 1279, 1282].includes(code)) return "snowy"
    return "rainy"
  }

  // 获取天气图标配置
  const getWeatherIconConfig = (type?: WeatherType) => {
    const weatherType = type || (weatherData?.current ? getWeatherType(weatherData.current.condition.code) : "cloudy")

    const configs = {
      sunny: { icon: <IconSun />, color: "#faad14", bg: "#fff7e6" },
      cloudy: { icon: <IconCloudy />, color: "#8c8c8c", bg: "#fafafa" },
      rainy: { icon: <IconLightRain />, color: "#1677ff", bg: "#e6f7ff" },
      snowy: { icon: <IconSnow />, color: "#69b1ff", bg: "#f0f5ff" },
      foggy: { icon: <IconFog />, color: "#bfbfbf", bg: "#f5f5f5" },
    }

    return configs[weatherType]
  }

  // 格式化日期
  const formatDate = () => {
    const now = new Date()
    const weekday = now.toLocaleDateString("zh-CN", { weekday: "short" })
    const dateStr = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
    return { weekday, dateStr }
  }

  // 获取温度颜色
  const getTempColor = (temp: number) => {
    if (temp >= 35) return THEME.error
    if (temp >= 28) return THEME.warning
    if (temp >= 18) return THEME.success
    return THEME.primary
  }

  // 获取湿度状态
  const getHumidityStatus = (humidity: number) => {
    if (humidity >= 80) return { status: "exception" as const, text: "过高", color: THEME.error }
    if (humidity >= 60) return { status: "normal" as const, text: "适宜", color: THEME.success }
    if (humidity >= 40) return { status: "active" as const, text: "偏低", color: THEME.warning }
    return { status: "exception" as const, text: "过低", color: THEME.error }
  }

  // 渲染天气图标
  const renderWeatherIcon = (size: "large" | "small" = "large") => {
    const config = getWeatherIconConfig()
    const isLarge = size === "large"

    if (loading && isLarge) {
      return (
        <div style={{
          width: isLarge ? 80 : 40,
          height: isLarge ? 80 : 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Spin indicator={<IconLoading style={{ fontSize: isLarge ? 32 : 16 }} />} />
        </div>
      )
    }

    return (
      <div style={{
        width: isLarge ? 80 : 40,
        height: isLarge ? 80 : 40,
        borderRadius: TOKENS.borderRadius.xl,
        backgroundColor: config.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isLarge ? TOKENS.fontSize.xxl : TOKENS.fontSize.lg,
        color: config.color,
        transition: 'all 0.3s ease',
      }}>
        {config.icon}
      </div>
    )
  }

  const { weekday, dateStr } = formatDate()
  const currentTemp = weatherData?.current ? Math.round(weatherData.current.temp_c) : null
  const tomorrowForecast = weatherData?.forecast?.forecastday?.[1]

  return (
    <Card
      title={
        <Space size="small">
          <IconMapDraw />
          <Text strong>环境监测</Text>
        </Space>
      }
      size="small"
      styles={{ body: { padding: TOKENS.spacing.md } }}
    >
      {/* ====== 第一部分：室外天气概览 ====== */}
      <Space direction="vertical" size={TOKENS.spacing.lg} style={{ width: '100%' }}>

        {/* 位置和日期 */}
        <div
          onClick={requestLocation}
          style={{ cursor: 'pointer' }}
        >
          <Space direction="vertical" size={TOKENS.spacing.xs}>
            <Title level={5} style={{ margin: 0 }}>
              当前地区
              <Tooltip title="点击更新定位">
                <IconInfo
                  style={{
                    fontSize: TOKENS.fontSize.sm,
                    color: THEME.textSecondary,
                    marginLeft: TOKENS.spacing.xs,
                  }}
                />
              </Tooltip>
            </Title>
            <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>
              <IconCalendar style={{ marginRight: TOKENS.spacing.xs }} />
              {weekday}, {dateStr}
            </Text>
          </Space>
        </div>

        {/* 温度和图标 */}
        <Row gutter={[TOKENS.spacing.lg, 0]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={TOKENS.spacing.xs}>
              <div style={{ fontSize: TOKENS.fontSize.xxl, fontWeight: 600, lineHeight: 1 }}>
                {currentTemp !== null ? `${currentTemp}` : '--'}
                <span style={{ fontSize: TOKENS.fontSize.xl, fontWeight: 300 }}>°C</span>
              </div>
              <Text type="secondary" style={{ fontSize: TOKENS.fontSize.sm }}>
                {weatherData?.current?.condition?.text || (loading ? '获取中...' : '暂无数据')}
              </Text>
            </Space>
          </Col>
          <Col flex="none">
            {renderWeatherIcon("large")}
          </Col>
        </Row>

        {/* 温度范围 */}
        <div style={{
          display: 'flex',
          gap: TOKENS.spacing.md,
          padding: `${TOKENS.spacing.sm}px ${TOKENS.spacing.md}px`,
          backgroundColor: THEME.background,
          borderRadius: TOKENS.borderRadius.lg,
        }}>
          <Space size={TOKENS.spacing.xs}>
            <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>最高</Text>
            <Text strong style={{ fontSize: TOKENS.fontSize.sm }}>
              {weatherData?.forecast?.forecastday?.[0]?.day?.maxtemp_c
                ? Math.round(weatherData.forecast.forecastday[0].day.maxtemp_c)
                : '--'}°
            </Text>
          </Space>
          <Divider type="vertical" />
          <Space size={TOKENS.spacing.xs}>
            <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>最低</Text>
            <Text strong style={{ fontSize: TOKENS.fontSize.sm }}>
              {weatherData?.forecast?.forecastday?.[0]?.day?.mintemp_c
                ? Math.round(weatherData.forecast.forecastday[0].day.mintemp_c)
                : '--'}°
            </Text>
          </Space>
        </div>

        {/* 室外气象参数 */}
        <Row gutter={[TOKENS.spacing.md, TOKENS.spacing.md]}>
          <Col span={12}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>湿度</Text>}
              value={weatherData?.current?.humidity ?? '--'}
              suffix="%"
              valueStyle={{ fontSize: TOKENS.fontSize.lg }}
              prefix={<IconMedicineChest style={{ color: THEME.primary }} />}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>风速</Text>}
              value={weatherData?.current?.wind_kph ? Math.round(weatherData.current.wind_kph) : '--'}
              suffix="km/h"
              valueStyle={{ fontSize: TOKENS.fontSize.lg }}
              prefix={<IconThunderbolt style={{ color: THEME.primary }} />}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>气压</Text>}
              value={weatherData?.current?.pressure_mb ? Math.round(weatherData.current.pressure_mb / 10) : '--'}
              suffix="hPa"
              valueStyle={{ fontSize: TOKENS.fontSize.lg }}
              prefix={<IconExperiment style={{ color: THEME.primary }} />}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>风向</Text>}
              value={weatherData?.current?.wind_dir || '--'}
              valueStyle={{ fontSize: TOKENS.fontSize.base }}
              prefix={<IconThunderbolt style={{ color: THEME.primary }} />}
            />
          </Col>
        </Row>

        {/* 明日预报 */}
        {tomorrowForecast && (
          <div style={{
            padding: `${TOKENS.spacing.md}px`,
            backgroundColor: THEME.background,
            borderRadius: TOKENS.borderRadius.lg,
            borderLeft: `3px solid ${THEME.primary}`,
          }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs, display: 'block', marginBottom: TOKENS.spacing.xs }}>
                  明日预报
                </Text>
                <Text strong style={{ fontSize: TOKENS.fontSize.base }}>
                  {Math.round(tomorrowForecast.day.maxtemp_c)}° / {Math.round(tomorrowForecast.day.mintemp_c)}°
                </Text>
              </Col>
              <Col>{renderWeatherIcon("small")}</Col>
            </Row>
          </div>
        )}

        <Divider style={{ margin: `${TOKENS.spacing.sm}px 0` }} />

        {/* ====== 第二部分：大棚室内环境 ====== */}
        <div>
          <Text strong style={{
            fontSize: TOKENS.fontSize.sm,
            display: 'block',
            marginBottom: TOKENS.spacing.md,
            color: THEME.textPrimary,
          }}>
            <IconThunderbolt style={{ marginRight: TOKENS.spacing.xs, color: THEME.primary }} />
            大棚环境参数
          </Text>

          <Row gutter={[TOKENS.spacing.md, TOKENS.spacing.md]}>
            {/* 室内温度 */}
            <Col span={12}>
              <div style={{
                padding: `${TOKENS.spacing.md}px`,
                backgroundColor: THEME.background,
                borderRadius: TOKENS.borderRadius.lg,
                borderLeft: `3px solid ${getTempColor(deviceData?.temperature || 20)}`,
              }}>
                <Statistic
                  title={
                    <Space size={4}>
                      <IconFire style={{ fontSize: TOKENS.fontSize.xs, color: THEME.error }} />
                      <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>室内温度</Text>
                    </Space>
                  }
                  value={deviceData ? deviceData.temperature.toFixed(1) : '--'}
                  suffix="°C"
                  valueStyle={{
                    fontSize: TOKENS.fontSize.xl,
                    color: getTempColor(deviceData?.temperature || 20),
                  }}
                />
              </div>
            </Col>

            {/* 室内湿度 */}
            <Col span={12}>
              <div style={{
                padding: `${TOKENS.spacing.md}px`,
                backgroundColor: THEME.background,
                borderRadius: TOKENS.borderRadius.lg,
                borderLeft: `3px solid ${getHumidityStatus(deviceData?.humidity || 50).color}`,
              }}>
                <Space direction="vertical" size={TOKENS.spacing.xs} style={{ width: '100%' }}>
                  <Space size={4}>
                    <IconMedicineChest style={{ fontSize: TOKENS.fontSize.xs, color: THEME.primary }} />
                    <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>室内湿度</Text>
                  </Space>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: TOKENS.spacing.xs }}>
                    <Text strong style={{ fontSize: TOKENS.fontSize.xl }}>
                      {deviceData ? (deviceData.humidity / 10).toFixed(1) : '--'}%
                    </Text>
                    <Tag
                      color={getHumidityStatus(deviceData?.humidity || 50).color === THEME.error ? 'error' :
                            getHumidityStatus(deviceData?.humidity || 50).color === THEME.warning ? 'warning' : 'success'}
                      style={{ fontSize: TOKENS.fontSize.xs, marginLeft: 0 }}
                    >
                      {getHumidityStatus(deviceData?.humidity || 50).text}
                    </Tag>
                  </div>
                  <Progress
                    percent={deviceData ? Math.min((deviceData.humidity / 10), 100) : 0}
                    size="small"
                    status={getHumidityStatus(deviceData?.humidity || 50).status}
                    showInfo={false}
                    strokeColor={getHumidityStatus(deviceData?.humidity || 50).color}
                  />
                </Space>
              </div>
            </Col>

            {/* CO2 浓度 */}
            <Col span={12}>
              <div style={{
                padding: `${TOKENS.spacing.md}px`,
                backgroundColor: THEME.background,
                borderRadius: TOKENS.borderRadius.lg,
              }}>
                <Statistic
                  title={
                    <Space size={4}>
                      <IconExperiment style={{ fontSize: TOKENS.fontSize.xs, color: THEME.primary }} />
                      <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>CO₂浓度</Text>
                    </Space>
                  }
                  value={deviceData?.co2 ?? '--'}
                  suffix="ppm"
                  valueStyle={{ fontSize: TOKENS.fontSize.lg }}
                />
              </div>
            </Col>

            {/* 光照强度 */}
            <Col span={12}>
              <div style={{
                padding: `${TOKENS.spacing.md}px`,
                backgroundColor: THEME.background,
                borderRadius: TOKENS.borderRadius.lg,
              }}>
                <Statistic
                  title={
                    <Space size={4}>
                      <IconSun style={{ fontSize: TOKENS.fontSize.xs, color: THEME.warning }} />
                      <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs }}>光照强度</Text>
                    </Space>
                  }
                  value={deviceData?.light ?? '--'}
                  suffix="lux"
                  valueStyle={{ fontSize: TOKENS.fontSize.lg }}
                />
              </div>
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: `${TOKENS.spacing.sm}px 0` }} />

        {/* ====== 第三部分：土壤参数 ====== */}
        <div>
          <Text strong style={{
            fontSize: TOKENS.fontSize.sm,
            display: 'block',
            marginBottom: TOKENS.spacing.md,
            color: THEME.textPrimary,
          }}>
            <IconExperiment style={{ marginRight: TOKENS.spacing.xs, color: THEME.success }} />
            土壤监测
          </Text>

          {/* 核心土壤指标 */}
          <Row gutter={[TOKENS.spacing.sm, TOKENS.spacing.sm]} style={{ marginBottom: TOKENS.spacing.md }}>
            <Col span={8}>
              <div style={{
                textAlign: 'center',
                padding: `${TOKENS.spacing.sm}px`,
                backgroundColor: THEME.background,
                borderRadius: TOKENS.borderRadius.md,
              }}>
                <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs, display: 'block', marginBottom: 2 }}>
                  地温
                </Text>
                <Text strong style={{ fontSize: TOKENS.fontSize.base }}>
                  {deviceData?.earth_temp ? deviceData.earth_temp.toFixed(1) : '--'}°C
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{
                textAlign: 'center',
                padding: `${TOKENS.spacing.sm}px`,
                backgroundColor: THEME.background,
                borderRadius: TOKENS.borderRadius.md,
              }}>
                <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs, display: 'block', marginBottom: 2 }}>
                  湿度
                </Text>
                <Text strong style={{ fontSize: TOKENS.fontSize.base }}>
                  {deviceData?.earth_water ? deviceData.earth_water.toFixed(1) : '--'}%
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{
                textAlign: 'center',
                padding: `${TOKENS.spacing.sm}px`,
                backgroundColor: THEME.background,
                borderRadius: TOKENS.borderRadius.md,
              }}>
                <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs, display: 'block', marginBottom: 2 }}>
                  EC值
                </Text>
                <Text strong style={{ fontSize: TOKENS.fontSize.base }}>
                  {deviceData?.earth_ec ?? '--'}
                </Text>
              </div>
            </Col>
          </Row>

          {/* NPK 养分 */}
          <div style={{
            padding: `${TOKENS.spacing.md}px`,
            backgroundColor: THEME.background,
            borderRadius: TOKENS.borderRadius.lg,
          }}>
            <Text type="secondary" style={{ fontSize: TOKENS.fontSize.xs, display: 'block', marginBottom: TOKENS.spacing.sm }}>
              养分含量 (N-P-K)
            </Text>
            <Row gutter={[TOKENS.spacing.sm, 0]}>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div>
                  <Tag color="green" style={{ marginBottom: TOKENS.spacing.xs }}>N</Tag>
                  <div style={{ fontSize: TOKENS.fontSize.base, fontWeight: 600 }}>
                    {deviceData?.earth_n ?? '--'}
                    <span style={{ fontSize: TOKENS.fontSize.xs, fontWeight: 400, color: THEME.textSecondary }}>
                      mg/kg
                    </span>
                  </div>
                </div>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div>
                  <Tag color="orange" style={{ marginBottom: TOKENS.spacing.xs }}>P</Tag>
                  <div style={{ fontSize: TOKENS.fontSize.base, fontWeight: 600 }}>
                    {deviceData?.earth_p ?? '--'}
                    <span style={{ fontSize: TOKENS.fontSize.xs, fontWeight: 400, color: THEME.textSecondary }}>
                      mg/kg
                    </span>
                  </div>
                </div>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div>
                  <Tag color="red" style={{ marginBottom: TOKENS.spacing.xs }}>K</Tag>
                  <div style={{ fontSize: TOKENS.fontSize.base, fontWeight: 600 }}>
                    {deviceData?.earth_k ?? '--'}
                    <span style={{ fontSize: TOKENS.fontSize.xs, fontWeight: 400, color: THEME.textSecondary }}>
                      mg/kg
                    </span>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </div>

      </Space>
    </Card>
  )
}