/**
 * AI Camera Capture API
 * 
 * 提供摄像头 URL 获取能力，供 AI 助手在需要视觉判断时使用。
 * AI 端会利用前端的 LiveStreamPlayer 渲染视频帧并截图后发送给 VLM 模型。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getGreenhouseCameraUrls } from '@/lib/db/settings-service'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取摄像头 URL
    const urls = await getGreenhouseCameraUrls()
    
    const hasCameraA = !!urls?.cameraAUrl?.trim()
    const hasCameraB = !!urls?.cameraBUrl?.trim()

    return NextResponse.json({
      success: true,
      cameras: {
        a: {
          available: hasCameraA,
          url: hasCameraA ? urls.cameraAUrl : null,
          name: '温室摄像头 A'
        },
        b: {
          available: hasCameraB, 
          url: hasCameraB ? urls.cameraBUrl : null,
          name: '温室摄像头 B'
        }
      },
      note: '摄像头画面需要通过前端 LiveStreamPlayer 渲染后截图。如果摄像头 URL 未配置，则不可用。'
    })
  } catch (error) {
    console.error('[AI Camera Capture] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get camera info' },
      { status: 500 }
    )
  }
}
