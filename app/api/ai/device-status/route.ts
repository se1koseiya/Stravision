/**
 * AI Device Status API
 * 
 * 为 AI 助手提供当前设备状态和环境数据
 */

import { NextResponse } from 'next/server'

// 这个端点会被 AI 调用来获取当前设备状态
export async function GET() {
  try {
    // 从 MQTT 服务获取最新的设备数据
    // 注意：这里需要从某个地方获取最新数据
    // 可以考虑使用 Redis 或内存缓存来存储最新的设备状态
    
    // 暂时返回示例数据结构
    return NextResponse.json({
      success: true,
      message: "请通过 SSE 连接 /api/mqtt/stream 获取实时设备数据",
      dataStructure: {
        temperature: "温度 (单位: 0.1°C, 需除以10)",
        humidity: "湿度 (单位: 0.1%, 需除以10)",
        light: "光照强度 (lux)",
        co2: "二氧化碳浓度 (ppm)",
        earth_temp: "土壤温度 (单位: 0.1°C, 需除以10)",
        earth_water: "土壤湿度 (%)",
        earth_ec: "土壤电导率 (μS/cm)",
        earth_n: "土壤氮含量 (mg/kg)",
        earth_p: "土壤磷含量 (mg/kg)",
        earth_k: "土壤钾含量 (mg/kg)",
        relay5: "水泵状态 (0=关闭, 1=开启)",
        relay6: "风扇状态 (0=关闭, 1=开启)",
        relay7: "补光灯状态 (0=关闭, 1=开启)",
        relay8: "白灯状态 (0=关闭, 1=开启)",
        led1: "红色LED亮度 (0-255)",
        led2: "绿色LED亮度 (0-255)",
        led3: "蓝色LED亮度 (0-255)",
        led4: "保留LED (0-255)"
      }
    })
  } catch (error) {
    console.error('[AI Device Status] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
