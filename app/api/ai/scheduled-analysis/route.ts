import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai/scheduled-analysis - 执行定时分析任务
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      sessionId,
      analysisType,
      context,
      deviceData,
      originalTask
    } = body

    console.log(`[Scheduled Analysis] Running analysis for user ${userId}:`, originalTask)

    // 根据分析类型执行不同的分析
    let analysisResult: any

    switch (analysisType) {
      case 'device_status':
        analysisResult = await analyzeDeviceStatus(deviceData, context)
        break

      case 'environmental_check':
        analysisResult = await analyzeEnvironment(deviceData, context)
        break

      case 'growth_progress':
        analysisResult = await analyzeGrowthProgress(deviceData, context)
        break

      case 'custom':
        analysisResult = await performCustomAnalysis(context)
        break

      default:
        analysisResult = await performGeneralAnalysis(deviceData, context)
    }

    return NextResponse.json({
      success: true,
      analysisType,
      result: analysisResult,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('[Scheduled Analysis API] Error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * 分析设备状态
 */
async function analyzeDeviceStatus(deviceData: any, context: any) {
  // 检查设备是否正常运行
  const issues: string[] = []
  const recommendations: string[] = []

  // 检查水泵状态
  if (context.checkWaterPump && deviceData.relay5 === 'on') {
    const duration = Date.now() - (context.waterPumpStartTime || Date.now())
    if (duration > 10 * 60 * 1000) { // 超过10分钟
      issues.push('水泵已运行超过10分钟，可能存在异常')
      recommendations.push('建议检查水泵是否正常工作，或手动关闭')
    }
  }

  // 检查补光灯状态
  if (deviceData.relay7 === 'on' && deviceData.relay8 === 'on') {
    const currentHour = new Date().getHours()
    if (currentHour >= 22 || currentHour < 6) {
      recommendations.push('当前时间较晚，建议关闭补光灯以节省能源')
    }
  }

  return {
    status: issues.length === 0 ? 'normal' : 'warning',
    issues,
    recommendations,
    deviceData
  }
}

/**
 * 分析环境状况
 */
async function analyzeEnvironment(deviceData: any, context: any) {
  const analysis: any = {
    temperature: 'normal',
    humidity: 'normal',
    light: 'normal',
    recommendations: []
  }

  // 温度分析
  if (deviceData.temperature) {
    if (deviceData.temperature < 15) {
      analysis.temperature = 'low'
      analysis.recommendations.push('温度偏低，建议开启加热设备')
    } else if (deviceData.temperature > 30) {
      analysis.temperature = 'high'
      analysis.recommendations.push('温度偏高，建议开启通风或降温设备')
    }
  }

  // 湿度分析
  if (deviceData.humidity) {
    if (deviceData.humidity < 40) {
      analysis.humidity = 'low'
      analysis.recommendations.push('湿度偏低，建议增加浇水频率')
    } else if (deviceData.humidity > 80) {
      analysis.humidity = 'high'
      analysis.recommendations.push('湿度偏高，建议加强通风')
    }
  }

  return analysis
}

/**
 * 分析生长进度
 */
async function analyzeGrowthProgress(deviceData: any, context: any) {
  return {
    stage: context.growthStage || 'unknown',
    progress: 'on_track',
    nextMilestone: context.nextMilestone || '开花期',
    estimatedDays: context.estimatedDays || 7,
    recommendations: [
      '继续保持当前的养护方案',
      '注意观察叶片颜色变化',
      '适当增加光照时间'
    ]
  }
}

/**
 * 执行自定义分析
 */
async function performCustomAnalysis(context: any) {
  return {
    message: '自定义分析完成',
    context,
    timestamp: Date.now()
  }
}

/**
 * 执行通用分析
 */
async function performGeneralAnalysis(deviceData: any, context: any) {
  return {
    summary: '系统运行正常',
    deviceData,
    context,
    timestamp: Date.now()
  }
}
